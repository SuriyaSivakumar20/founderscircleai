import prisma from '../prismaClient';
import bcrypt from 'bcryptjs';

export const seedDatabase = async () => {
  try {
    console.log('Seeding B.I.R.D database...');

    // ── Companies (Startups) ─────────────────────────────────────────────────
    const companies = [
      {
        name: 'Aura Dynamics',
        industry: 'SaaS / Customer Engagement',
        stage: 'Series A',
        location: 'Chennai, Tamil Nadu',
        targetRaise: 20,
        teamSize: 45,
        foundedYear: 2020,
        description: 'AI-powered customer engagement platform helping B2B companies reduce churn by 40%. Live with 120+ enterprise clients.',
        website: 'https://auradynamics.example.com',
        linkedinUrl: 'https://www.linkedin.com/company/auradynamics',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=AD&backgroundColor=dbeafe&textColor=1e40af',
      },
      {
        name: 'Vortex Software',
        industry: 'SaaS / Enterprise Software',
        stage: 'Seed',
        location: 'Chennai, Tamil Nadu',
        targetRaise: 8,
        teamSize: 18,
        foundedYear: 2022,
        description: 'End-to-end ERP suite for mid-market manufacturers in tier-2 cities. 30 paying customers, ₹4.2Cr ARR.',
        website: 'https://vortexsoftware.example.com',
        linkedinUrl: 'https://www.linkedin.com/company/vortexsoftware',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=VS&backgroundColor=ede9fe&textColor=5b21b6',
      },
      {
        name: 'TradeFlow',
        industry: 'Fintech / Brokerage',
        stage: 'Pre-Seed',
        location: 'Bengaluru, Karnataka',
        targetRaise: 3,
        teamSize: 8,
        foundedYear: 2023,
        description: 'Next-gen algorithmic retail trading platform targeting India\'s 50M+ first-time investors.',
        website: 'https://tradeflow.example.com',
        linkedinUrl: 'https://www.linkedin.com/company/tradeflow',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=TF&backgroundColor=dcfce7&textColor=166534',
      },
      {
        name: 'QuickBite Logistics',
        industry: 'Foodtech / Logistics',
        stage: 'Seed',
        location: 'Bengaluru, Karnataka',
        targetRaise: 12,
        teamSize: 65,
        foundedYear: 2021,
        description: 'Dark kitchen + last-mile logistics network. 2,400 daily orders across 6 Bengaluru zones.',
        website: 'https://quickbite.example.com',
        linkedinUrl: 'https://www.linkedin.com/company/quickbite',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=QB&backgroundColor=fff7ed&textColor=c2410c',
      },
      {
        name: 'PaySprint',
        industry: 'Fintech / Payments',
        stage: 'Series A',
        location: 'Bengaluru, Karnataka',
        targetRaise: 35,
        teamSize: 92,
        foundedYear: 2019,
        description: 'Payment infrastructure API powering 800+ SMBs with UPI, NEFT, and cross-border payments.',
        website: 'https://paysprint.example.com',
        linkedinUrl: 'https://www.linkedin.com/company/paysprint',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=PS&backgroundColor=fef9c3&textColor=854d0e',
      },
      {
        name: 'ZephyrHealth AI',
        industry: 'HealthTech',
        stage: 'Pre-Seed',
        location: 'Hyderabad, Telangana',
        targetRaise: 5,
        teamSize: 12,
        foundedYear: 2023,
        description: 'Voice-first AI diagnostic tool for ASHA workers in rural India. Works offline. 9-language support. 34,000 screenings in 8 months.',
        website: 'https://zephyrhealth.example.com',
        linkedinUrl: 'https://www.linkedin.com/company/zephyrhealth',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=ZH&backgroundColor=fce7f3&textColor=9d174d',
      },
      {
        name: 'NitiGrid Technologies',
        industry: 'CleanTech',
        stage: 'Seed',
        location: 'Chennai, Tamil Nadu',
        targetRaise: 8,
        teamSize: 20,
        foundedYear: 2022,
        description: 'Blockchain-based renewable energy marketplace for C&I buyers. 12 MW traded in Tamil Nadu. 18% cost savings vs grid.',
        website: 'https://nitigrid.example.com',
        linkedinUrl: 'https://www.linkedin.com/company/nitigrid',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=NG&backgroundColor=d1fae5&textColor=065f46',
      },
    ];

    for (const company of companies) {
      await prisma.company.upsert({
        where: { name: company.name },
        update: {},
        create: company,
      });
    }

    // ── Investors ────────────────────────────────────────────────────────────
    const investors = [
      {
        name: 'Zenith Ventures',
        description: 'Early-stage VC deploying ₹5–25 Cr in B2B SaaS, Fintech, and Deep Tech across India.',
        location: 'Bengaluru, Karnataka',
        minCheckSize: 5,
        maxCheckSize: 25,
        targetSectors: 'SaaS,Fintech,Deep Tech,B2B',
        website: 'https://zenithventures.example.com',
        linkedinUrl: 'https://www.linkedin.com/company/zenithventures',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=ZV&backgroundColor=ede9fe&textColor=4c1d95',
      },
      {
        name: 'Catalyst Partners',
        description: 'Seed and Pre-Seed focused fund. ₹2–10 Cr tickets. Special interest in HealthTech and CleanTech.',
        location: 'Mumbai, Maharashtra',
        minCheckSize: 2,
        maxCheckSize: 10,
        targetSectors: 'HealthTech,CleanTech,EdTech,Consumer',
        website: 'https://catalystpartners.example.com',
        linkedinUrl: 'https://www.linkedin.com/company/catalystpartners',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=CP&backgroundColor=fef3c7&textColor=92400e',
      },
      {
        name: 'Nova Funds',
        description: 'Growth-stage investor writing ₹20–80 Cr checks in Series A/B. Focus on Fintech, Logistics, SaaS.',
        location: 'Mumbai, Maharashtra',
        minCheckSize: 20,
        maxCheckSize: 80,
        targetSectors: 'Fintech,Logistics,SaaS,E-commerce',
        website: 'https://novafunds.example.com',
        linkedinUrl: 'https://www.linkedin.com/company/novafunds',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=NF&backgroundColor=dbeafe&textColor=1e3a8a',
      },
      {
        name: 'Priya Venture Partners',
        description: 'Family office deploying ₹3–15 Cr. Looking for B2B SaaS and CleanTech at Seed/Pre-A stage.',
        location: 'Bengaluru, Karnataka',
        minCheckSize: 3,
        maxCheckSize: 15,
        targetSectors: 'SaaS,CleanTech,B2B,Agri-Tech',
        website: 'https://priyaventures.example.com',
        linkedinUrl: 'https://www.linkedin.com/company/priyaventures',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=PV&backgroundColor=fce7f3&textColor=831843',
      },
      {
        name: 'Anant Capital Group',
        description: 'NBFC + VC hybrid. ₹25–80 Cr for Series A/B. Strong interest in Fintech, EdTech, and Circular Economy.',
        location: 'New Delhi',
        minCheckSize: 25,
        maxCheckSize: 80,
        targetSectors: 'Fintech,EdTech,Logistics,CleanTech',
        website: 'https://anantcapital.example.com',
        linkedinUrl: 'https://www.linkedin.com/company/anantcapital',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=AC&backgroundColor=d1fae5&textColor=064e3b',
      },
    ];

    for (const investor of investors) {
      await prisma.investor.upsert({
        where: { name: investor.name },
        update: {},
        create: investor,
      });
    }

    // ── Demo Users ──────────────────────────────────────────────────────────
    const hashedPw = await bcrypt.hash('password123', 10);

    const demoUsers = [
      {
        email: 'founder@bird.ai',
        password: hashedPw,
        name: 'Arjun Nair',
        role: 'FOUNDER',
        industry: 'Fintech / Payments',
        stage: 'Seed',
        location: 'Bengaluru, Karnataka',
        targetRaise: 10,
        teamSize: 14,
        foundedYear: 2022,
        description: 'Building the next generation payment rails for India\'s underserved SMB sector.',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=AN&backgroundColor=dbeafe&textColor=1e40af',
      },
      {
        email: 'investor@bird.ai',
        password: hashedPw,
        name: 'Kavya Reddy',
        role: 'INVESTOR',
        industry: 'Venture Capital',
        stage: 'Seed',
        location: 'Bengaluru, Karnataka',
        minCheckSize: 5,
        maxCheckSize: 20,
        teamSize: 8,
        description: 'VC Partner at mid-stage fund. Looking for capital-efficient B2B SaaS and Fintech founders.',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=KR&backgroundColor=fce7f3&textColor=9d174d',
      },
      {
        email: 'admin@bird.ai',
        password: await bcrypt.hash('admin2025', 10),
        name: 'B.I.R.D Admin',
        role: 'ADMIN',
        industry: 'Technology',
        description: 'Official platform administrator for B.I.R.D — Business Intelligence & Resource Development.',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=BA&backgroundColor=f1f5f9&textColor=0f172a',
      },
    ];

    for (const u of demoUsers) {
      await prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: u,
      });
    }

    // ── Seed demo posts ─────────────────────────────────────────────────────
    const founderUser = await prisma.user.findUnique({ where: { email: 'founder@bird.ai' } });
    const investorUser = await prisma.user.findUnique({ where: { email: 'investor@bird.ai' } });

    if (founderUser) {
      const existingPosts = await prisma.post.count({ where: { authorId: founderUser.id } });
      if (existingPosts === 0) {
        await prisma.post.createMany({
          data: [
            {
              content: 'Excited to announce we have crossed ₹4.2 Cr ARR with 30 paying enterprise customers. Our NPS score hit 72 last quarter. Currently raising our Seed round — DMs open for serious investors aligned with B2B Fintech.',
              tag: 'Raising Seed',
              metric: '₹10 Cr',
              metricLabel: 'Target Raise',
              authorId: founderUser.id,
            },
            {
              content: 'What most people miss about SMB payments is the reconciliation problem — not the payment itself. We solved that. 800 SMBs onboarded in 6 months with zero churn. The product-market fit is real.',
              tag: 'Traction Update',
              metric: '₹0',
              metricLabel: 'Churn Rate',
              authorId: founderUser.id,
            },
          ],
        });
      }
    }

    if (investorUser) {
      const existingPosts = await prisma.post.count({ where: { authorId: investorUser.id } });
      if (existingPosts === 0) {
        await prisma.post.create({
          data: {
            content: 'Actively deploying at Seed stage in Fintech and B2B SaaS. Ticket size: ₹5–20 Cr. Looking for founders with strong unit economics and 6+ months of paid traction. Not interested in pre-revenue. DM with your one-pager.',
            tag: 'Investment Mandate',
            metric: '₹5–20 Cr',
            metricLabel: 'Ticket Size',
            authorId: investorUser.id,
          },
        });
      }
    }

    console.log('B.I.R.D seeding complete. Demo credentials:');
    console.log('  Founder  → founder@bird.ai / password123');
    console.log('  Investor → investor@bird.ai / password123');
    console.log('  Admin    → admin@bird.ai / admin2025');
  } catch (error) {
    console.error('Seed error:', error);
  }
};
