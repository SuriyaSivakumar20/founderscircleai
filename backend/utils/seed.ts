import prisma from '../prismaClient';
import bcrypt from 'bcryptjs';

export const seedDatabase = async () => {
  try {
    console.log('Seeding database with real Indian public entities...');

    // 1. Create Public Companies
    const companies = [
      {
        name: 'Aura Dynamics',
        industry: 'SaaS / Customer Engagement',
        description: 'Aura Dynamics makes it fast and easy for businesses to delight their customers and employees.',
        location: 'Chennai, Tamil Nadu',
        website: 'https://auradynamics.example.com',
        linkedinUrl: 'https://www.linkedin.com/company/auradynamics',
        avatar: 'https://picsum.photos/seed/auradynamics/200',
      },
      {
        name: 'Vortex Software',
        industry: 'SaaS / Enterprise Software',
        description: 'A growing technology company offering a comprehensive suite of business software.',
        location: 'Chennai, Tamil Nadu',
        website: 'https://vortexsoftware.example.com',
        linkedinUrl: 'https://www.linkedin.com/company/vortexsoftware',
        avatar: 'https://picsum.photos/seed/vortex/200',
      },
      {
        name: 'TradeFlow',
        industry: 'Fintech / Brokerage',
        description: 'A rising stock broker, offering retail and institutional brokerage, currencies, and commodities trading.',
        location: 'Bengaluru, Karnataka',
        website: 'https://tradeflow.example.com',
        linkedinUrl: 'https://www.linkedin.com/company/tradeflow',
        avatar: 'https://picsum.photos/seed/tradeflow/200',
      },
      {
        name: 'QuickBite Logistics',
        industry: 'Foodtech / Logistics',
        description: 'An emerging on-demand delivery platform with a tech-first approach to logistics.',
        location: 'Bengaluru, Karnataka',
        website: 'https://quickbite.example.com',
        linkedinUrl: 'https://www.linkedin.com/company/quickbite',
        avatar: 'https://picsum.photos/seed/quickbite/200',
      },
      {
        name: 'PaySprint',
        industry: 'Fintech / Payments',
        description: 'A full-stack financial services company in India, helping businesses with payments and banking.',
        location: 'Bengaluru, Karnataka',
        website: 'https://paysprint.example.com',
        linkedinUrl: 'https://www.linkedin.com/company/paysprint',
        avatar: 'https://picsum.photos/seed/paysprint/200',
      }
    ];

    for (const company of companies) {
      await prisma.company.upsert({
        where: { name: company.name },
        update: {},
        create: company,
      });
    }

    // 2. Create Public Investors
    const investors = [
      {
        name: 'Zenith Ventures',
        description: 'Zenith Ventures is a leading venture capital firm investing across India and Southeast Asia.',
        location: 'Bengaluru, Karnataka',
        website: 'https://zenithventures.example.com',
        linkedinUrl: 'https://www.linkedin.com/company/zenithventures',
        avatar: 'https://picsum.photos/seed/zenith/200',
      },
      {
        name: 'Catalyst Partners',
        description: 'Catalyst Partners is a venture capital firm that is the first partner to exceptional teams everywhere.',
        location: 'Bengaluru, Karnataka',
        website: 'https://catalystpartners.example.com',
        linkedinUrl: 'https://www.linkedin.com/company/catalystpartners',
        avatar: 'https://picsum.photos/seed/catalyst/200',
      },
      {
        name: 'Nova Funds',
        description: 'Nova Funds is an early-stage venture fund that backs startups with both capital and active mentoring.',
        location: 'Mumbai / Bengaluru',
        website: 'https://novafunds.example.com',
        linkedinUrl: 'https://www.linkedin.com/company/novafunds',
        avatar: 'https://picsum.photos/seed/nova/200',
      }
    ];

    for (const investor of investors) {
      await prisma.investor.upsert({
        where: { name: investor.name },
        update: {},
        create: investor,
      });
    }

    // 3. Create a Demo Admin User
    const hashedPassword = await bcrypt.hash('password', 10);
    await prisma.user.upsert({
      where: { email: 'testing@test.com' },
      update: {},
      create: {
        email: 'testing@test.com',
        password: hashedPassword,
        name: 'FoundersCircle Admin',
        role: 'ADMIN',
        industry: 'Technology',
        description: 'Official administrator for the FoundersCircle platform.',
        avatar: 'https://picsum.photos/seed/admin/200',
      },
    });

    console.log('Seeding complete.');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
};
