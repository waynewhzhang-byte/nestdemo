import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BooksService } from './books.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/dto/auth.dto';
import {
  CreateBookDto,
  UpdateBookDto,
  QueryBooksDto,
  AdjustInventoryDto,
} from './dto/books.dto';

@ApiTags('Books')
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new book (Admin/Teacher only)' })
  async create(@Body() createBookDto: CreateBookDto) {
    return this.booksService.create(createBookDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all books with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'isbn', required: false, type: String })
  async findAll(@Query() query: QueryBooksDto) {
    return this.booksService.findAll(query);
  }

  @Get('statistics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get book statistics (Admin/Teacher only)' })
  async getStatistics() {
    return this.booksService.getStatistics();
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all book categories with counts' })
  async getCategories() {
    return this.booksService.getCategories();
  }

  @Get('isbn/:isbn')
  @ApiOperation({ summary: 'Get book by ISBN' })
  async findByIsbn(@Param('isbn') isbn: string) {
    return this.booksService.findByIsbn(isbn);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get book by ID' })
  async findOne(@Param('id') id: string) {
    return this.booksService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update book (Admin/Teacher only)' })
  async update(@Param('id') id: string, @Body() updateBookDto: UpdateBookDto) {
    return this.booksService.update(id, updateBookDto);
  }

  @Post(':id/adjust-inventory')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Adjust book inventory (Admin only)' })
  async adjustInventory(
    @Param('id') id: string,
    @Body() adjustDto: AdjustInventoryDto,
  ) {
    return this.booksService.adjustInventory(id, adjustDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete book (Admin only)' })
  async remove(@Param('id') id: string) {
    return this.booksService.remove(id);
  }
}
