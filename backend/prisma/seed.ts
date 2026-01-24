import { PrismaClient, Role, BookStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@library.edu' },
    update: {},
    create: {
      email: 'admin@library.edu',
      password: adminPassword,
      name: 'System Administrator',
      role: Role.ADMIN,
      phone: '+1234567890',
    },
  });
  console.log('✅ Created admin user:', admin.email);

  const studentPassword = await bcrypt.hash('student123', 10);
  const student = await prisma.user.upsert({
    where: { email: 'student@library.edu' },
    update: {},
    create: {
      email: 'student@library.edu',
      password: studentPassword,
      name: 'John Student',
      role: Role.STUDENT,
      studentId: 'STU2023001',
      phone: '+1234567891',
    },
  });
  console.log('✅ Created student user:', student.email);

  const teacherPassword = await bcrypt.hash('teacher123', 10);
  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@library.edu' },
    update: {},
    create: {
      email: 'teacher@library.edu',
      password: teacherPassword,
      name: 'Dr. Jane Teacher',
      role: Role.TEACHER,
      teacherId: 'TCH2023001',
      phone: '+1234567892',
    },
  });
  console.log('✅ Created teacher user:', teacher.email);

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
      availableCopies: 3,
      status: BookStatus.AVAILABLE,
    },
  ];

  for (const book of books) {
    await prisma.book.upsert({
      where: { isbn: book.isbn },
      update: {},
      create: book,
    });
    console.log('✅ Created book:', book.title);
  }

  console.log('🎉 Database seeded successfully!');
  console.log('\n📝 Test Accounts:');
  console.log('   Admin: admin@library.edu / admin123');
  console.log('   Student: student@library.edu / student123');
  console.log('   Teacher: teacher@library.edu / teacher123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
