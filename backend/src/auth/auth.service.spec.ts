import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

type PrismaUserMock = {
  findUnique: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
};

describe('AuthService', () => {
  let service: AuthService;
  let prismaUser: PrismaUserMock;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = {
    id: 'user-1',
    email: 'test@school.edu',
    password: 'hashedpassword',
    name: 'Test User',
    role: 'STUDENT',
    studentId: 'STU001',
    teacherId: null,
    phone: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prismaUser = {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    const mockPrisma = { user: prismaUser };

    const mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@school.edu',
      password: 'password123',
      name: 'Test User',
      studentId: 'STU001',
      role: UserRole.STUDENT,
    };

    it('should successfully register a new user', async () => {
      prismaUser.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');
      prismaUser.create.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('access-token');

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(registerDto.email);
    });

    it('should throw ConflictException if email already exists', async () => {
      prismaUser.findUnique.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@school.edu',
      password: 'password123',
    };

    it('should successfully login with valid credentials', async () => {
      prismaUser.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('access-token');

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result.user.email).toBe(loginDto.email);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      prismaUser.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      prismaUser.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getProfile', () => {
    it('should return user profile without password', async () => {
      prismaUser.findUnique.mockResolvedValue(mockUser);

      const result = await service.getProfile('user-1');

      expect(result).toMatchObject({ id: mockUser.id, email: mockUser.email, name: mockUser.name, role: mockUser.role });
      expect(result).not.toHaveProperty('password');
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const updateDto = { name: 'Updated Name' };
      const updatedUser = { ...mockUser, ...updateDto };
      prismaUser.update.mockResolvedValue(updatedUser);

      const result = await service.updateProfile('user-1', updateDto);

      expect(result.name).toBe('Updated Name');
    });
  });

  describe('refresh', () => {
    it('should return new tokens for valid refresh token', async () => {
      jwtService.verify.mockReturnValue({ sub: mockUser.id, email: mockUser.email, role: mockUser.role });
      prismaUser.findUnique.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('new-access-token');

      const result = await service.refresh('valid-refresh-token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.id).toBe(mockUser.id);
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid');
      });

      await expect(service.refresh('invalid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      jwtService.verify.mockReturnValue({ sub: 'non-existent', email: 'x@x.com', role: 'STUDENT' });
      prismaUser.findUnique.mockResolvedValue(null);

      await expect(service.refresh('valid-token')).rejects.toThrow(UnauthorizedException);
    });
  });
});
