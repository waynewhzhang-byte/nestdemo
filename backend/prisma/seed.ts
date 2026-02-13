import { PrismaClient, Role, BookStatus, BorrowingStatus, ReservationStatus, FineStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data
  await prisma.fine.deleteMany();
  await prisma.borrowing.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.book.deleteMany();
  await prisma.user.deleteMany();

  // Create Users
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@library.edu',
      password: adminPassword,
      name: 'System Administrator',
      role: Role.ADMIN,
      phone: '+1234567890',
      isActive: true,
    },
  });
  console.log('✅ Created admin user:', admin.email);

  const teacherPassword = await bcrypt.hash('teacher123', 10);
  const teacher = await prisma.user.create({
    data: {
      email: 'teacher@library.edu',
      password: teacherPassword,
      name: 'Dr. Jane Teacher',
      role: Role.TEACHER,
      teacherId: 'TCH2023001',
      phone: '+1234567892',
      isActive: true,
    },
  });
  console.log('✅ Created teacher user:', teacher.email);

  const studentPassword = await bcrypt.hash('student123', 10);
  const student1 = await prisma.user.create({
    data: {
      email: 'student@library.edu',
      password: studentPassword,
      name: 'John Student',
      role: Role.STUDENT,
      studentId: 'STU2023001',
      phone: '+1234567891',
      isActive: true,
    },
  });
  console.log('✅ Created student user:', student1.email);

  const student2 = await prisma.user.create({
    data: {
      email: 'student2@library.edu',
      password: studentPassword,
      name: 'Alice Smith',
      role: Role.STUDENT,
      studentId: 'STU2023002',
      phone: '+1234567893',
      isActive: true,
    },
  });

  const student3 = await prisma.user.create({
    data: {
      email: 'student3@library.edu',
      password: studentPassword,
      name: 'Bob Johnson',
      role: Role.STUDENT,
      studentId: 'STU2023003',
      phone: '+1234567894',
      isActive: true,
    },
  });
  console.log('✅ Created additional student users');

  // Create Books
  const books = [
    {
      isbn: '978-7-111-12345-6',
      title: 'TypeScript Deep Dive',
      author: 'Basarat Ali Syed',
      publisher: "O'Reilly",
      publishedYear: 2020,
      category: 'Programming',
      description: 'A comprehensive guide to TypeScript',
      totalCopies: 5,
      availableCopies: 5,
      status: BookStatus.AVAILABLE,
    },
    {
      isbn: '978-7-111-67890-1',
      title: 'Clean Code',
      author: 'Robert C. Martin',
      publisher: 'Prentice Hall',
      publishedYear: 2008,
      category: 'Software Engineering',
      description: 'A Handbook of Agile Software Craftsmanship',
      totalCopies: 3,
      availableCopies: 2,
      status: BookStatus.AVAILABLE,
    },
    {
      isbn: '978-0-13-235088-4',
      title: 'Clean Architecture',
      author: 'Robert C. Martin',
      publisher: 'Prentice Hall',
      publishedYear: 2017,
      category: 'Software Engineering',
      description: "A Craftsman's Guide to Software Structure and Design",
      totalCopies: 2,
      availableCopies: 0,
      status: BookStatus.BORROWED,
    },
    {
      isbn: '978-0-201-63361-0',
      title: 'Design Patterns',
      author: 'Gang of Four',
      publisher: 'Addison-Wesley',
      publishedYear: 1994,
      category: 'Programming',
      description: 'Elements of Reusable Object-Oriented Software',
      totalCopies: 5,
      availableCopies: 3,
      status: BookStatus.AVAILABLE,
    },
    {
      isbn: '978-0-321-12742-6',
      title: 'Refactoring',
      author: 'Martin Fowler',
      publisher: 'Addison-Wesley',
      publishedYear: 2018,
      category: 'Programming',
      description: 'Improving the Design of Existing Code',
      totalCopies: 3,
      availableCopies: 3,
      status: BookStatus.AVAILABLE,
    },
    {
      isbn: '978-0-596-51774-8',
      title: 'JavaScript: The Good Parts',
      author: 'Douglas Crockford',
      publisher: "O'Reilly Media",
      publishedYear: 2008,
      category: 'Programming',
      description: 'Most of this book deals with the good parts',
      totalCopies: 2,
      availableCopies: 2,
      status: BookStatus.AVAILABLE,
    },
    {
      isbn: '978-0-13-711008-5',
      title: 'Architecture Patterns with Python',
      author: 'Harry Percival',
      publisher: "O'Reilly Media",
      publishedYear: 2020,
      category: 'Programming',
      description: 'Enabling Test-Driven Development',
      totalCopies: 2,
      availableCopies: 2,
      status: BookStatus.AVAILABLE,
    },
    {
      isbn: '978-1-68050-261-5',
      title: 'Database Internals',
      author: 'Alex Petrov',
      publisher: "O'Reilly Media",
      publishedYear: 2019,
      category: 'Database',
      description: 'A Deep Dive into How Distributed Data Systems Work',
      totalCopies: 1,
      availableCopies: 1,
      status: BookStatus.AVAILABLE,
    },
  ];

  const createdBooks = [];
  for (const book of books) {
    const created = await prisma.book.create({ data: book });
    createdBooks.push(created);
    console.log('✅ Created book:', created.title);
  }

  // Create Borrowings
  const borrowing1 = await prisma.borrowing.create({
    data: {
      userId: student1.id,
      bookId: createdBooks[2].id,
      borrowedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: BorrowingStatus.ACTIVE,
      renewedCount: 0,
      maxRenewals: 2,
    },
  });
  console.log('✅ Created active borrowing:', student1.name, '->', createdBooks[2].title);

  const borrowing2 = await prisma.borrowing.create({
    data: {
      userId: student2.id,
      bookId: createdBooks[1].id,
      borrowedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      status: BorrowingStatus.OVERDUE,
      renewedCount: 1,
      maxRenewals: 2,
    },
  });
  console.log('✅ Created overdue borrowing:', student2.name, '->', createdBooks[1].title);

  await prisma.borrowing.create({
    data: {
      userId: student3.id,
      bookId: createdBooks[3].id,
      borrowedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000),
      returnedAt: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000),
      status: BorrowingStatus.RETURNED,
      renewedCount: 0,
      maxRenewals: 2,
    },
  });
  console.log('✅ Created returned borrowing');

  await prisma.reservation.create({
    data: {
      userId: student3.id,
      bookId: createdBooks[2].id,
      status: ReservationStatus.PENDING,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  console.log('✅ Created pending reservation');

  await prisma.fine.create({
    data: {
      borrowingId: borrowing2.id,
      userId: borrowing2.userId,
      amount: 3.0,
      reason: 'Overdue by 6 days',
      status: FineStatus.UNPAID,
    },
  });
  console.log('✅ Created unpaid fine');

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📝 Test Accounts (for E2E testing):');
  console.log('='.repeat(50));
  console.log('Admin:   admin@library.edu   / admin123');
  console.log('Teacher: teacher@library.edu / teacher123');
  console.log('Student: student@library.edu / student123');
  console.log('\n📚 Sample Data:');
  console.log('- 8 books (2 borrowed, 6 available)');
  console.log('- 3 borrowings (1 active, 1 overdue, 1 returned)');
  console.log('- 1 pending reservation');
  console.log('- 1 unpaid fine ($3.00)');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
