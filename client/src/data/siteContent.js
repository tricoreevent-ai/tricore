export const homeExpertise = [
  {
    title: 'Sports Tournaments',
    description:
      'From corporate cricket leagues to apartment tournaments, we handle fixtures, formats, officials, and finals.'
  },
  {
    title: 'Corporate Events',
    description:
      'We plan conferences, offsites, launches, and team-building experiences that reflect your culture and business goals.'
  },
  {
    title: 'Community Competitions',
    description:
      'We organize structured, fair, and high-energy leagues for clubs, neighborhoods, and residential communities.'
  },
  {
    title: 'End-to-End Execution',
    description:
      'Concept, planning, logistics, operations, and post-event analysis are managed under one experienced team.'
  }
];

export const homeHeroFallbackBanners = [
  {
    id: 'tricore-home-default',
    badge: 'Corporate events, sports tournaments, and team experiences',
    title: 'Where passion meets precision.',
    description:
      'TriCore Events crafts high-energy sports tournaments and seamless corporate experiences that build teams, strengthen culture, and create community.',
    imageUrl: '',
    imageAlt: 'TriCore Events homepage banner',
    primaryActionLabel: 'Explore Our Events',
    primaryActionHref: '/events',
    secondaryActionLabel: 'Corporate Experiences',
    secondaryActionHref: '/corporate-events',
    isActive: true
  }
];

export const homePageContentFallback = {
  themePrimaryColor: '#0F5FDB',
  themeSecondaryColor: '#0A2C66',
  themeHighlightColor: '#0EA5E9',
  sponsorshipEventName: 'Corporate Cricket Tournament 2026',
  galleryEnabledHome: false,
  galleryEnabledAbout: false,
  homeGalleryTitle: 'TriCore in Action',
  homeGalleryDescription:
    'Upload event moments, crowd energy, team celebrations, and venue snapshots for the homepage gallery.',
  homeGalleryImages: [
    {
      id: 'sample-gallery-1',
      imageUrl: '/uploads/gallery/sample-cricket-dawn.svg',
      imageAlt: 'Cricket stadium under a warm sunrise sky',
      caption: 'Sunrise match atmosphere with a tournament-ready wicket and venue lighting.'
    },
    {
      id: 'sample-gallery-2',
      imageUrl: '/uploads/gallery/sample-training-drill.svg',
      imageAlt: 'Athletes running a speed and agility training drill',
      caption: 'Warm-up drills and fitness prep that set the tone before competition starts.'
    },
    {
      id: 'sample-gallery-3',
      imageUrl: '/uploads/gallery/sample-cheer-stand.svg',
      imageAlt: 'Crowd cheering beside a brightly lit sports arena',
      caption: 'Crowd energy, team chants, and supporter moments from the side lines.'
    },
    {
      id: 'sample-gallery-4',
      imageUrl: '/uploads/gallery/sample-night-finals.svg',
      imageAlt: 'Night finals atmosphere with floodlights and a cricket pitch',
      caption: 'Finals-night atmosphere under floodlights with championship focus and pace.'
    }
  ],
  aboutGalleryTitle: 'Inside TriCore',
  aboutGalleryDescription:
    'Build the About page gallery with team moments, crowd stories, venue setup, and event-delivery highlights.',
  aboutGalleryImages: [
    {
      id: 'sample-gallery-about-1',
      imageUrl: '/uploads/gallery/sample-cricket-dawn.svg',
      imageAlt: 'Cricket stadium under a warm sunrise sky',
      caption: 'Sunrise match atmosphere with a tournament-ready wicket and venue lighting.'
    },
    {
      id: 'sample-gallery-about-2',
      imageUrl: '/uploads/gallery/sample-training-drill.svg',
      imageAlt: 'Athletes running a speed and agility training drill',
      caption: 'Warm-up drills and fitness prep that set the tone before competition starts.'
    },
    {
      id: 'sample-gallery-about-3',
      imageUrl: '/uploads/gallery/sample-cheer-stand.svg',
      imageAlt: 'Crowd cheering beside a brightly lit sports arena',
      caption: 'Crowd energy, team chants, and supporter moments from the side lines.'
    },
    {
      id: 'sample-gallery-about-4',
      imageUrl: '/uploads/gallery/sample-night-finals.svg',
      imageAlt: 'Night finals atmosphere with floodlights and a cricket pitch',
      caption: 'Finals-night atmosphere under floodlights with championship focus and pace.'
    }
  ],
  introBadge: 'Bring People Together',
  introTitle: 'Sports-led events that build energy, belonging, and connection',
  introDescription:
    'TriCore Events creates tournaments and community-driven experiences that help companies, clubs, apartments, and neighborhoods connect through healthy competition.',
  introActionLabel: 'Explore Our Events',
  introActionHref: '/events',
  introImageUrl: '',
  introImageAlt: 'TriCore event spotlight',
  speakersTitle: 'TriCore Event Leadership',
  speakersDescription:
    'Spotlight the organizers, captains, hosts, or event leaders who shape the TriCore experience.',
  speakers: [
    {
      id: 'speaker-1',
      name: 'Darrell Steward',
      role: 'Event Strategist',
      imageUrl: '',
      imageAlt: 'Darrell Steward'
    },
    {
      id: 'speaker-2',
      name: 'Mariya John',
      role: 'Wellness Speaker',
      imageUrl: '',
      imageAlt: 'Mariya John'
    },
    {
      id: 'speaker-3',
      name: 'John Karter',
      role: 'Operations Lead',
      imageUrl: '',
      imageAlt: 'John Karter'
    },
    {
      id: 'speaker-4',
      name: 'Reena John',
      role: 'Community Host',
      imageUrl: '',
      imageAlt: 'Reena John'
    }
  ],
  highlightsTitle: 'TriCore Highlights',
  highlightsDescription:
    'Showcase the energy, participation, and shared moments that make every TriCore event feel alive.',
  stats: [
    { id: 'stat-1', value: '10k+', label: 'Ticket confirmed' },
    { id: 'stat-2', value: '16', label: 'Partners' },
    { id: 'stat-3', value: '150k+', label: 'Participants' }
  ],
  highlightImages: Array.from({ length: 6 }, (_, index) => ({
    id: `highlight-${index + 1}`,
    imageUrl: '',
    imageAlt: `Homepage highlight ${index + 1}`
  })),
  eventsTitle: 'Upcoming Tournaments',
  eventsDescription:
    'Feature the next published TriCore sports and corporate events that are ready for discovery and registration.',
  testimonialsTitle: 'TriCore Community Stories',
  testimonialsDescription:
    'Share real moments from participants, organizers, and communities who came together through sport.',
  testimonials: [
    {
      id: 'testimonial-1',
      name: 'Jordhan Daniyel',
      role: 'Corporate Participant',
      quote:
        'TriCore turned a routine company sports day into something our team still talks about months later.',
      imageUrl: '',
      imageAlt: 'Jordhan Daniyel',
      avatarUrl: '',
      avatarAlt: 'Jordhan Daniyel'
    },
    {
      id: 'testimonial-2',
      name: 'Mariya Thomas',
      role: 'Community Organizer',
      quote:
        'The energy, the coordination, and the communication made the whole event feel effortless for our residents.',
      imageUrl: '',
      imageAlt: 'Mariya Thomas',
      avatarUrl: '',
      avatarAlt: 'Mariya Thomas'
    },
    {
      id: 'testimonial-3',
      name: 'Lorance Peter',
      role: 'Brand Partner',
      quote:
        'They brought structure and polish without losing the excitement that makes people want to come back.',
      imageUrl: '',
      imageAlt: 'Lorance Peter',
      avatarUrl: '',
      avatarAlt: 'Lorance Peter'
    }
  ],
  ctaBadge: 'Bring people together',
  ctaTitle: 'Plan a TriCore event that people will remember',
  ctaDescription:
    'Use the final section to invite registrations, event enquiries, or new conversations around sport, teamwork, and community.',
  ctaActionLabel: 'Plan with TriCore',
  ctaActionHref: '/contact',
  ctaImageUrl: '',
  ctaImageAlt: 'Call to action visual'
};

export const whyChooseItems = [
  '20+ years of legacy across sports and corporate event execution.',
  'A unique mix of sports management rigor and corporate event finesse.',
  'Meticulous planning across venue flow, communication, safety, and scheduling.',
  'A trusted network of venues, vendors, officials, and support partners.'
];

export const aboutHighlights = {
  intro:
    'TriCore Events is led by professionals with more than twenty years of experience across sports operations, corporate engagement, and on-ground event delivery. We work with experienced venues, officials, vendors, production crews, and logistics partners so every event feels polished, reliable, and people-first.',
  vision:
    'To be the most trusted and innovative event management brand in India, inspiring individuals and organizations to build stronger connections through sports and shared experiences.',
  mission: [
    'Deliver excellence through disciplined execution and attention to detail.',
    'Champion a sports culture inside organizations and local communities.',
    'Build lasting trust through transparency, reliability, and measurable results.',
    'Create impactful moments that leave people energized, valued, and connected.'
  ],
  csr: [
    'Healthy lifestyle programs that encourage active living through accessible sports.',
    'Grassroots development initiatives that support local talent and young athletes.',
    'Youth engagement through structured and positive sports-led environments.',
    'Community cohesion programs that turn events into shared experiences.'
  ],
  sportsBelief:
    'In a fast-paced and increasingly digital world, sports remain one of the most powerful ways to build discipline, leadership, resilience, and belonging. TriCore uses sport as a force for stronger teams, healthier lifestyles, and more connected communities.'
};

export const corporateTournamentSpotlight = {
  badge: 'Featured Tournament',
  title: 'Corporate Cricket Tournament 2026',
  description:
    'TriCore Sports is preparing a professionally managed cricket tournament experience in association with Spark 7 Sports Arena and with Sarva Horizon as Event Partner. The format is built to bring corporate teams, cricket lovers, and brand partners into one energetic sporting environment shaped by teamwork, fair competition, and community connection.',
  supportingCopy:
    'Beyond the matches themselves, the tournament gives brands a high-visibility platform to meet an active audience through a vibrant, participation-led event atmosphere.',
  primaryActionLabel: 'View Upcoming Events',
  primaryActionHref: '/events',
  secondaryActionLabel: 'Talk to TriCore',
  secondaryActionHref: '/contact'
};

export const corporateEventsHomeFeature = {
  badge: 'Corporate Events & Experiences',
  title:
    'From leadership meetings to large-scale launches, TriCore manages corporate experiences end to end.',
  description:
    'We combine operational discipline, creative planning, and calm on-site coordination to deliver polished corporate events that reflect your brand and keep your teams focused on outcomes.',
  points: [
    'Meetings, conferences, and executive gatherings with venue, vendor, AV, and registration support.',
    'Purpose-driven team building programs, retreats, and strategic offsites designed around your culture goals.',
    'AGMs, employee engagement events, product launches, and brand activations executed with professional precision.'
  ],
  primaryActionLabel: 'Explore Corporate Events',
  primaryActionHref: '/corporate-events',
  secondaryActionLabel: 'Get a Quick Quote',
  secondaryActionHref: '/contact'
};

export const corporateEventsContent = {
  heroBadge: 'Corporate Events & Experiences',
  heroTitle: 'Seamless Planning, Flawless Execution, Unforgettable Moments',
  heroDescription:
    "TriCore Events is more than an event management company. We are your strategic partner in creating impactful corporate experiences that reflect your brand's culture, values, and vision.",
  heroSupportingCopy:
    'From intimate boardroom meetings to high-stakes company-wide conferences, we blend meticulous planning with creative flair to deliver events that run smoothly from start to finish. Our team handles every detail so you can stay focused on your people, your message, and your goals.',
  focusAreas: [
    'Corporate meetings and conferences',
    'Team building programs',
    'Corporate camps and offsites',
    'AGMs and shareholder events',
    'Employee engagement celebrations',
    'Product launches and brand activations'
  ],
  introTitle: 'What We Do',
  introDescription:
    "We do not just manage events; we engineer experiences. Our mission is to transform your organizational needs into memorable and productive events that continue to resonate long after the event concludes.",
  introSupportingCopy:
    'We work closely with you to understand your objectives, then use our expertise in logistics, design, and coordination to build a seamless attendee journey from invitation to wrap-up.',
  servicesTitle: 'Types of Corporate Events We Handle',
  servicesDescription:
    'Our service suite is tailored to the specific needs of modern organizations, whether you are planning an internal culture initiative, a formal stakeholder gathering, or a high-visibility launch.',
  services: [
    {
      icon: 'events',
      title: 'Corporate Meetings & Conferences',
      description:
        'Elevate business gatherings from standard to strategic while we manage the moving pieces behind the scenes.',
      points: [
        'End-to-end logistics including venue sourcing, contract negotiation, and vendor management.',
        'Advanced technical production with AV, lighting, live streaming, and presentation support.',
        'On-site coordination for registration, speaker flow, guest handling, and timeline control.'
      ]
    },
    {
      icon: 'users',
      title: 'Team Building Programs',
      description:
        'Invest in team cohesion with engaging activities designed to strengthen real connection and collaboration.',
      points: [
        'Tailored formats such as escape-room challenges, outdoor adventures, cooking workshops, or music-led sessions.',
        'Facilitated debriefs that turn the experience into practical insights on teamwork, communication, and leadership.',
        'Inclusive design so activities remain accessible, thoughtful, and engaging for every participant.'
      ]
    },
    {
      icon: 'calendar',
      title: 'Corporate Camps & Strategic Offsites',
      description:
        'Move your team into an environment that encourages innovation, sharper thinking, and stronger bonding.',
      points: [
        'Destination discovery with travel, accommodation, and resort or retreat logistics handled by our team.',
        'Balanced programming that combines strategic sessions with recreation and informal connection.',
        'Full event-flow ownership from welcome dinner to closing session so leadership can stay present.'
      ]
    },
    {
      icon: 'bank',
      title: 'Annual General Meetings & Shareholder Events',
      description:
        'Deliver a professional, transparent, and well-managed AGM that reinforces stakeholder confidence.',
      points: [
        'Formal venue setup with seating plans, stage design, signage, and registration zones.',
        'Operational support for proxy management, ballot handling, and structured attendee flow.',
        'Professional protocol management that keeps timing, agenda, and event tone firmly on track.'
      ]
    },
    {
      icon: 'trophy',
      title: 'Employee Engagement & Appreciation Events',
      description:
        'Celebrate your people with events that strengthen morale, recognition, and workplace culture.',
      points: [
        'Themed annual days, festive celebrations, galas, and holiday gatherings with decor, catering, and entertainment.',
        'Internal competitions, sports days, quiz nights, and awards ceremonies that drive participation and pride.',
        'Wellness workshops, family days, and CSR-style initiatives that help build a connected internal community.'
      ]
    },
    {
      icon: 'sparkle',
      title: 'Product Launches & Brand Activations',
      description:
        'Create momentum and make a strong first impression with launch experiences designed around your story.',
      points: [
        'Venue selection and thematic design aligned with your product narrative and brand identity.',
        'Guest, media, and invitation management for a polished, high-impact experience.',
        'Interactive demonstration zones, photo moments, and experiential touchpoints that keep audiences engaged.'
      ]
    }
  ],
  whyChooseTitle: 'Why Choose TriCore Events',
  whyChooseItems: [
    'A partnership mindset that aligns event execution with your business goals and brand standards.',
    'Proven experience managing both high-pressure sports events and large-scale corporate functions.',
    'End-to-end accountability from first concept through final breakdown, with one reliable point of contact.',
    'Flexible planning shaped around your audience, objectives, operating style, and budget realities.',
    'Professional delivery grounded in punctuality, transparency, preparation, and calm problem-solving.'
  ],
  processTitle: 'Our Proven Process',
  processDescription:
    'Our approach is collaborative, transparent, and designed to reduce pressure for your internal team while keeping every stage visible and under control.',
  process: [
    {
      icon: 'search',
      title: 'Discovery & Strategy',
      description:
        'We begin by listening closely to your goals, audience, budget, and vision so we can shape the right event roadmap.'
    },
    {
      icon: 'edit',
      title: 'Concept & Planning',
      description:
        'We present a detailed proposal covering venue options, creative direction, timelines, and vendor recommendations.'
    },
    {
      icon: 'settings',
      title: 'Coordination & Logistics',
      description:
        'Our team manages contracts, production details, staffing, and on-site logistics well before event day begins.'
    },
    {
      icon: 'check',
      title: 'Seamless Execution',
      description:
        'On event day we run the flow, solve issues quietly behind the scenes, and protect a polished guest experience.'
    },
    {
      icon: 'chart',
      title: 'Post-Event Review',
      description:
        'We close with a thoughtful debrief, key learnings, and feedback review so future initiatives start stronger.'
    }
  ],
  credibilityTitle: 'Our Experience & Credibility',
  credibilityDescription:
    'TriCore Events is built on real-world execution. Our leadership team has managed high-stakes sports events, large-scale corporate gatherings, and intimate executive retreats, giving us the systems, resourcefulness, and situational calm needed to deliver consistently strong outcomes.',
  credibilitySupportingCopy:
    'We understand the pressure that comes with representing a brand in front of employees, leaders, clients, or shareholders. That is why we focus on preparation, accountability, and practical problem-solving at every stage.',
  ctaTitle: 'Ready to create a corporate event that is as productive as it is memorable?',
  ctaDescription: "Let's plan your next experience.",
  primaryActionLabel: 'Get a Quick Quote',
  primaryActionHref: '/contact',
  secondaryActionLabel: 'Contact Us Today',
  secondaryActionHref: '/contact'
};

export const partnerHighlights = [
  {
    name: 'Spark 7 Sports Arena',
    role: 'Venue & Sports Arena Partner',
    description:
      'A tournament-ready venue partner supporting professionally managed matchday experiences, player flow, and crowd energy.'
  },
  {
    name: 'Sarva Horizon',
    role: 'Event Partner',
    description:
      'A collaboration partner helping strengthen event presentation, business visibility, and partner engagement around TriCore experiences.'
  }
];

export const eventsContent = {
  sports: [
    'Corporate tournaments in cricket, football, volleyball, badminton, and more.',
    'Apartment and community leagues for RWAs, clubs, and seasonal resident tournaments.',
    'School and college competitions with safe and professionally managed environments.',
    'Custom tournament management with bespoke formats, scoring, and multi-venue logistics.'
  ],
  corporate: [
    'Corporate meetings, conferences, and leadership sessions with logistics and technical production support.',
    'Team-building programs, corporate camps, and strategic offsites aligned with culture and business goals.',
    'Employee engagement days, AGMs, appreciation events, and internal celebrations managed end to end.',
    'Product launches and brand activations that combine guest management, storytelling, and live experience design.'
  ],
  process: [
    {
      icon: 'search',
      title: 'Discovery & Strategy',
      description:
        'We begin by understanding your goals, audience, business context, and event vision.'
    },
    {
      icon: 'calendar',
      title: 'Meticulous Planning',
      description:
        'Venue selection, budgeting, design, staffing, vendors, and detailed run sheets are mapped in advance.'
    },
    {
      icon: 'settings',
      title: 'Logistics & Coordination',
      description:
        'We manage registration, equipment, officiating, hospitality, first aid, and participant flow.'
    },
    {
      icon: 'check',
      title: 'Flawless Execution',
      description:
        'Our on-ground managers and event crew lead the day with control, speed, and clarity.'
    },
    {
      icon: 'chart',
      title: 'Post-Event Analysis',
      description:
        'We review outcomes, highlight key moments, and provide a post-event summary with insights.'
    }
  ],
  difference:
    'With two decades of experience, TriCore anticipates challenges early, manages risk professionally, and brings calm control to fast-moving event environments. Clients get more than an organizer. They get a partner committed to event success and participant satisfaction.'
};

export const contactContent = {
  email: 'contact@tricoreevents.online',
  website: 'https://www.tricoreevents.online/',
  partners: [
    {
      name: 'Vinod Kartha',
      phones: ['+91 89718 54650', '+91 78926 22644']
    },
    {
      name: 'Ken Mohan',
      phones: ['+91 70229 92358']
    }
  ]
};
