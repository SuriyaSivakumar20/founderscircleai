import prisma from '../prismaClient';
import bcrypt from 'bcryptjs';

export const seedDatabase = async () => {
  try {
    console.log('Seeding B.I.R.D database...');

    // ── 10 Real Indian Startup Companies ────────────────────────────────────
    const companies = [
      {
        name: 'Zepto',
        industry: 'Quick Commerce',
        stage: 'Series F',
        location: 'Mumbai, Maharashtra',
        targetRaise: 800,
        teamSize: 5000,
        foundedYear: 2021,
        description:
          'India\'s leading 10-minute grocery delivery platform operating in 25+ cities with 500,000+ daily orders. Valued at $5B+. Backed by Y Combinator, Nexus Venture Partners, and StepStone Group. Profitable at the city level across its top 10 markets.',
        website: 'https://www.zeptonow.com',
        linkedinUrl: 'https://www.linkedin.com/company/zeptonow',
        avatar:
          'https://api.dicebear.com/7.x/initials/svg?seed=ZP&backgroundColor=fef3c7&textColor=92400e',
      },
      {
        name: 'Razorpay',
        industry: 'Fintech / Payments',
        stage: 'Series F',
        location: 'Bengaluru, Karnataka',
        targetRaise: 0,
        teamSize: 3000,
        foundedYear: 2014,
        description:
          'India\'s leading full-stack financial solutions company processing payments for 10M+ businesses. Valued at $7.5B. Products span payment gateway, banking, payroll, and lending. Completed "reverse flip" back to India in 2025. Confidential IPO filing in progress.',
        website: 'https://razorpay.com',
        linkedinUrl: 'https://www.linkedin.com/company/razorpay',
        avatar:
          'https://api.dicebear.com/7.x/initials/svg?seed=RP&backgroundColor=dbeafe&textColor=1e40af',
      },
      {
        name: 'Darwinbox',
        industry: 'HR Tech / SaaS',
        stage: 'Series D',
        location: 'Hyderabad, Telangana',
        targetRaise: 250,
        teamSize: 1200,
        foundedYear: 2015,
        description:
          'Cloud-based HR platform serving 3M+ employees across 850+ enterprises in Asia-Pacific. Unicorn valued at $1B+. Backed by Microsoft, Salesforce Ventures, and Teachers\' Venture Growth. Aggressively expanding into North America and the Middle East.',
        website: 'https://darwinbox.com',
        linkedinUrl: 'https://www.linkedin.com/company/darwinbox',
        avatar:
          'https://api.dicebear.com/7.x/initials/svg?seed=DB&backgroundColor=ede9fe&textColor=4c1d95',
      },
      {
        name: 'Zetwerk',
        industry: 'Manufacturing / B2B Marketplace',
        stage: 'Series F',
        location: 'Bengaluru, Karnataka',
        targetRaise: 0,
        teamSize: 3000,
        foundedYear: 2018,
        description:
          'Global manufacturing marketplace connecting buyers to 10,000+ manufacturers across India, Southeast Asia, and Mexico. Unicorn valued at $3.1B. $300M+ ARR, IPO-bound in 2026. Processing consumer electronics, aerospace, and defence components.',
        website: 'https://www.zetwerk.com',
        linkedinUrl: 'https://www.linkedin.com/company/zetwerk',
        avatar:
          'https://api.dicebear.com/7.x/initials/svg?seed=ZW&backgroundColor=d1fae5&textColor=065f46',
      },
      {
        name: 'PhysicsWallah',
        industry: 'EdTech',
        stage: 'Series B',
        location: 'New Delhi',
        targetRaise: 500,
        teamSize: 8000,
        foundedYear: 2016,
        description:
          'India\'s most affordable ed-tech platform with 30M+ active learners across 17 countries. Unicorn valued at $1.1B. Offers UPSC, JEE, NEET, and GATE preparation at 10x lower cost than incumbents. Expanding offline with 400+ Vidyapeeth centres.',
        website: 'https://www.pw.live',
        linkedinUrl: 'https://www.linkedin.com/company/physicswallah',
        avatar:
          'https://api.dicebear.com/7.x/initials/svg?seed=PW&backgroundColor=fce7f3&textColor=9d174d',
      },
      {
        name: 'Shiprocket',
        industry: 'Logistics / E-commerce Enablement',
        stage: 'Series E',
        location: 'New Delhi',
        targetRaise: 400,
        teamSize: 2000,
        foundedYear: 2017,
        description:
          'India\'s largest e-commerce shipping aggregator serving 200,000+ sellers with access to 25+ courier partners including FedEx, DHL, and Delhivery. $100M+ ARR. 2.5Cr+ shipments monthly. Pre-IPO and exploring public markets.',
        website: 'https://www.shiprocket.in',
        linkedinUrl: 'https://www.linkedin.com/company/shiprocket',
        avatar:
          'https://api.dicebear.com/7.x/initials/svg?seed=SR&backgroundColor=fff7ed&textColor=c2410c',
      },
      {
        name: 'Pocket FM',
        industry: 'Audio Entertainment / Content',
        stage: 'Series D',
        location: 'Bengaluru, Karnataka',
        targetRaise: 300,
        teamSize: 600,
        foundedYear: 2019,
        description:
          'AI-powered audio entertainment platform with 100M+ users and 200,000+ hours of serialised audio content across 15 languages. $150M+ raised from Stepstone, KKR, and others. Highest content monetisation rate in India\'s audio market.',
        website: 'https://pocketfm.com',
        linkedinUrl: 'https://www.linkedin.com/company/pocket-fm',
        avatar:
          'https://api.dicebear.com/7.x/initials/svg?seed=PF&backgroundColor=fef9c3&textColor=854d0e',
      },
      {
        name: 'Rapido',
        industry: 'Mobility / Ride Hailing',
        stage: 'Series D',
        location: 'Bengaluru, Karnataka',
        targetRaise: 350,
        teamSize: 1200,
        foundedYear: 2015,
        description:
          'India\'s largest bike taxi and auto platform with 25M+ customers across 100+ cities. 5M+ rides daily, generating $500M+ GMV annually. Backed by Swiggy, Shell Ventures, and WestBridge. Profitable in 60+ cities. Expanding into cab aggregation.',
        website: 'https://rapido.bike',
        linkedinUrl: 'https://www.linkedin.com/company/rapido-bike-taxi',
        avatar:
          'https://api.dicebear.com/7.x/initials/svg?seed=RD&backgroundColor=dbeafe&textColor=1e3a8a',
      },
      {
        name: 'Healthify (HealthifyMe)',
        industry: 'HealthTech / Wellness',
        stage: 'Series C',
        location: 'Bengaluru, Karnataka',
        targetRaise: 150,
        teamSize: 800,
        foundedYear: 2012,
        description:
          'Asia\'s largest AI-driven health and fitness platform with 35M+ users. Combines nutrition tracking, AI coaches, and live dietician consultations. $100M+ raised from LeapFrog, Tata Digital, and Khosla Ventures. Profitable unit economics since 2023.',
        website: 'https://www.healthifyme.com',
        linkedinUrl: 'https://www.linkedin.com/company/healthifyme',
        avatar:
          'https://api.dicebear.com/7.x/initials/svg?seed=HM&backgroundColor=d1fae5&textColor=065f46',
      },
      {
        name: 'Open Financial Technologies',
        industry: 'Neobanking / Fintech',
        stage: 'Series D',
        location: 'Bengaluru, Karnataka',
        targetRaise: 200,
        teamSize: 700,
        foundedYear: 2017,
        description:
          'India\'s largest SMB neobank platform serving 2.5M+ businesses. Processes $24B+ in annual transactions. Unicorn backed by IIFL, Temasek, and Google. Integrates banking, accounting, and payroll into one API-first OS for small businesses.',
        website: 'https://open.money',
        linkedinUrl: 'https://www.linkedin.com/company/openfinancial',
        avatar:
          'https://api.dicebear.com/7.x/initials/svg?seed=OF&backgroundColor=e0f2fe&textColor=075985',
      },
    ];

    for (const company of companies) {
      await prisma.company.upsert({
        where: { name: company.name },
        update: {
          description: company.description,
          stage: company.stage,
          teamSize: company.teamSize,
          targetRaise: company.targetRaise,
        },
        create: company,
      });
    }

    // ── 10 Real Indian Investors ─────────────────────────────────────────────
    const investors = [
      {
        name: 'Peak XV Partners',
        description:
          'Formerly Sequoia Capital India & SEA, Peak XV manages $9B+ across 13 funds with 400+ portfolio companies including Zomato, CRED, Byju\'s, OYO, and Razorpay. Invests from seed (via Surge accelerator) to pre-IPO. India\'s most prolific unicorn factory.',
        location: 'Bengaluru, Karnataka',
        minCheckSize: 10,
        maxCheckSize: 500,
        targetSectors: 'SaaS,Fintech,Consumer,HealthTech,EdTech,Deep Tech',
        website: 'https://www.peakxv.com',
        linkedinUrl: 'https://www.linkedin.com/company/peakxvpartners',
        avatar:
          'https://api.dicebear.com/7.x/initials/svg?seed=PX&backgroundColor=dbeafe&textColor=1e40af',
      },
      {
        name: 'Accel India',
        description:
          'India arm of global tier-1 VC Accel (Menlo Park). $3B+ AUM in India across multiple funds. First investor in Flipkart, Swiggy, and Freshworks. Focuses on early-stage to Series B with deep operational support from a 20-person partner team.',
        location: 'Bengaluru, Karnataka',
        minCheckSize: 5,
        maxCheckSize: 100,
        targetSectors: 'SaaS,Fintech,Consumer,B2B,Deep Tech',
        website: 'https://www.accel.com/india',
        linkedinUrl: 'https://www.linkedin.com/company/accel',
        avatar:
          'https://api.dicebear.com/7.x/initials/svg?seed=AC&backgroundColor=ede9fe&textColor=4c1d95',
      },
      {
        name: 'Blume Ventures',
        description:
          'India\'s most active early-stage VC with $800M+ AUM across four funds and 120+ portfolio companies including Unacademy, Purplle, Spinny, Cashify, and Slice. Provides hands-on mentorship, hiring support, and follow-on capital at Series A.',
        location: 'Mumbai, Maharashtra',
        minCheckSize: 3,
        maxCheckSize: 20,
        targetSectors: 'SaaS,Fintech,Consumer,HealthTech,CleanTech',
        website: 'https://blume.vc',
        linkedinUrl: 'https://www.linkedin.com/company/blume-ventures',
        avatar:
          'https://api.dicebear.com/7.x/initials/svg?seed=BV&backgroundColor=fce7f3&textColor=9d174d',
      },
      {
        name: '3one4 Capital',
        description:
          'Bengaluru-based early-stage VC founded by Pranav and Siddarth Pai. $750M+ AUM with a data-driven portfolio strategy. Companies include Licious, DarwinBox, Fampay, Simpl, Setu, and Basil. Renowned for rigorous term sheets and founder-first approach.',
        location: 'Bengaluru, Karnataka',
        minCheckSize: 3,
        maxCheckSize: 25,
        targetSectors: 'SaaS,Fintech,Consumer,HealthTech,Deep Tech',
        website: 'https://3one4.com',
        linkedinUrl: 'https://www.linkedin.com/company/3one4capital',
        avatar:
          'https://api.dicebear.com/7.x/initials/svg?seed=34&backgroundColor=d1fae5&textColor=065f46',
      },
      {
        name: 'Elevation Capital',
        description:
          'Formerly SAIF Partners India, Elevation Capital manages $2.6B+ and has been investing in India since 2001. Portfolio includes Paytm, Swiggy, Meesho, Urban Company, and ShareChat. Led by Ravi Adusumalli. One of the most trusted growth-stage investors in India.',
        location: 'New Delhi',
        minCheckSize: 10,
        maxCheckSize: 200,
        targetSectors: 'Consumer,Fintech,SaaS,E-commerce,HealthTech',
        website: 'https://elevationcapital.com',
        linkedinUrl: 'https://www.linkedin.com/company/elevation-capital',
        avatar:
          'https://api.dicebear.com/7.x/initials/svg?seed=EC&backgroundColor=fef3c7&textColor=92400e',
      },
      {
        name: 'Nexus Venture Partners',
        description:
          'Cross-border VC with $1.5B+ AUM investing across India and Silicon Valley. Portfolio includes Snapdeal, Delhivery, Unacademy, Postman, and Druva. Focuses on companies that can scale globally from India. Partner team includes ex-operators from Google and Cisco.',
        location: 'Mumbai, Maharashtra',
        minCheckSize: 10,
        maxCheckSize: 100,
        targetSectors: 'SaaS,E-commerce,Deep Tech,Logistics,Consumer',
        website: 'https://nexusvp.com',
        linkedinUrl: 'https://www.linkedin.com/company/nexus-venture-partners',
        avatar:
          'https://api.dicebear.com/7.x/initials/svg?seed=NV&backgroundColor=e0f2fe&textColor=075985',
      },
      {
        name: 'Kalaari Capital',
        description:
          'Early-stage technology VC with $650M+ AUM. Portfolio includes Dream11, SUGAR Cosmetics, Urban Company, and Snapdeal. Founded by Vani Kola — one of India\'s most prominent VCs. Known for backing contrarian ideas before the market consensus.',
        location: 'Bengaluru, Karnataka',
        minCheckSize: 3,
        maxCheckSize: 50,
        targetSectors: 'Consumer,SaaS,HealthTech,Fintech,D2C',
        website: 'https://www.kalaari.com',
        linkedinUrl: 'https://www.linkedin.com/company/kalaari-capital',
        avatar:
          'https://api.dicebear.com/7.x/initials/svg?seed=KC&backgroundColor=fff7ed&textColor=c2410c',
      },
      {
        name: 'Stellaris Venture Partners',
        description:
          'Founded by the former Matrix Partners India team, Stellaris focuses on product-first companies solving uniquely Indian problems. $300M+ AUM. Portfolio includes Recko (acquired by Stripe), Plaeto, Jar, and Jai Kisan. Known for early conviction and concentrated bets.',
        location: 'Bengaluru, Karnataka',
        minCheckSize: 3,
        maxCheckSize: 20,
        targetSectors: 'SaaS,Fintech,Consumer,AgriTech',
        website: 'https://stellarisvp.com',
        linkedinUrl: 'https://www.linkedin.com/company/stellaris-venture-partners',
        avatar:
          'https://api.dicebear.com/7.x/initials/svg?seed=SV&backgroundColor=f1f5f9&textColor=334155',
      },
      {
        name: 'Lightspeed India',
        description:
          'India arm of global Lightspeed Venture Partners with $1B+ AUM. Portfolio includes OYO, Udaan, ShareChat, Byju\'s, and Innovaccer. Invests from Seed to Series B with a strong sector focus on enterprise software, consumer, and healthcare tech.',
        location: 'Bengaluru, Karnataka',
        minCheckSize: 5,
        maxCheckSize: 100,
        targetSectors: 'Enterprise,Consumer,HealthTech,SaaS,Fintech',
        website: 'https://lsvp.com',
        linkedinUrl: 'https://www.linkedin.com/company/lightspeed-india-partners',
        avatar:
          'https://api.dicebear.com/7.x/initials/svg?seed=LS&backgroundColor=fef9c3&textColor=854d0e',
      },
      {
        name: 'Z47 (formerly Matrix Partners India)',
        description:
          'Rebranded from Matrix Partners India in 2024, Z47 manages $1B+ with a portfolio spanning OYO, Ola, Razorpay, Practo, and Upstox. Led by Avnish Bajaj and Tarun Davda. Invests across consumer internet, fintech, and SaaS with significant post-investment platform support.',
        location: 'Mumbai, Maharashtra',
        minCheckSize: 5,
        maxCheckSize: 100,
        targetSectors: 'Consumer,Fintech,SaaS,Mobility',
        website: 'https://www.z47.com',
        linkedinUrl: 'https://www.linkedin.com/company/z47vc',
        avatar:
          'https://api.dicebear.com/7.x/initials/svg?seed=Z4&backgroundColor=dbeafe&textColor=1e3a8a',
      },
    ];

    for (const investor of investors) {
      await prisma.investor.upsert({
        where: { name: investor.name },
        update: {
          description: investor.description,
          minCheckSize: investor.minCheckSize,
          maxCheckSize: investor.maxCheckSize,
          targetSectors: investor.targetSectors,
        },
        create: investor,
      });
    }

    // ── Demo Users ────────────────────────────────────────────────────────────
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
        description:
          'Building the next generation payment rails for India\'s underserved SMB sector. 30 paying customers, ₹4.2 Cr ARR, zero churn.',
        avatar:
          'https://api.dicebear.com/7.x/initials/svg?seed=AN&backgroundColor=dbeafe&textColor=1e40af',
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
        description:
          'VC Partner at mid-stage fund. Looking for capital-efficient B2B SaaS and Fintech founders with 6+ months of paid traction.',
        avatar:
          'https://api.dicebear.com/7.x/initials/svg?seed=KR&backgroundColor=fce7f3&textColor=9d174d',
      },
      {
        email: 'admin@bird.ai',
        password: await bcrypt.hash('admin2025', 10),
        name: 'B.I.R.D Admin',
        role: 'ADMIN',
        industry: 'Technology',
        description:
          'Official platform administrator for B.I.R.D — Business Intelligence & Resource Development.',
        avatar:
          'https://api.dicebear.com/7.x/initials/svg?seed=BA&backgroundColor=f1f5f9&textColor=0f172a',
      },
    ];

    for (const u of demoUsers) {
      await prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: u,
      });
    }

    // ── Demo Posts ────────────────────────────────────────────────────────────
    const founderUser = await prisma.user.findUnique({ where: { email: 'founder@bird.ai' } });
    const investorUser = await prisma.user.findUnique({ where: { email: 'investor@bird.ai' } });

    if (founderUser) {
      const existingPosts = await prisma.post.count({ where: { authorId: founderUser.id } });
      if (existingPosts === 0) {
        await prisma.post.createMany({
          data: [
            {
              content:
                'Excited to share that we\'ve crossed ₹4.2 Cr ARR with 30 paying enterprise customers. Our NPS hit 72 last quarter — above industry average for B2B payments. Currently raising our Seed round of ₹10 Cr. DMs open for investors aligned with B2B Fintech.',
              tag: 'Raising Seed',
              metric: '₹10 Cr',
              metricLabel: 'Target Raise',
              authorId: founderUser.id,
            },
            {
              content:
                'What most founders miss about SMB payments: it\'s not the payment that\'s broken — it\'s reconciliation. We solve the full workflow. Result: 800 SMBs onboarded in 6 months, zero churn. Product-market fit is real.',
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
            content:
              'Actively deploying at Seed stage. Ticket: ₹5–20 Cr. Looking for B2B SaaS and Fintech founders with strong unit economics and 6+ months of paid traction. Not interested in pre-revenue. Share your one-pager and last 3 months of growth metrics.',
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
