export interface BlogArticle {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readMinutes: number;
  category: string;
  image?: string;
  content: string[];
}

export const blogArticles: BlogArticle[] = [
  {
    slug: "home-decor-ideas-for-indian-homes",
    title: "10 Home Decor Ideas for Indian Homes (That Won't Break the Bank)",
    excerpt:
      "From statement wall clocks to layered cushion covers, here are practical ways to elevate an Indian living room without a full renovation.",
    date: "2026-09-01",
    readMinutes: 5,
    category: "Styling Tips",
    content: [
      "Decorating a home in India means balancing tradition, climate and budget. You don't need a designer budget to make a space feel considered — you need a few well-chosen pieces and a clear eye.",
      "1. Start with one statement wall. A large wall clock, a set of framed prints, or a single oversized mirror anchors the room. Everything else can be simple.",
      "2. Layer cushions in odd numbers. Three or five cushions in mixed textures (cotton, linen, velvet) instantly make a sofa look styled.",
      "3. Use baskets for storage. Laundry baskets and woven storage double as decor — they hide clutter and add warmth to corners.",
      "4. Let light do the work. White and warm-neutral walls make small Indian homes feel larger. Add one warm lamp per seating area.",
      "5. Bring in one natural material. Wood, cane, or jute — a single natural texture makes a space feel grounded and premium.",
      "6. Style surfaces in threes. A tray, a vase and a small stack of books on a coffee table looks intentional, not cluttered.",
      "7. Choose a consistent accent colour. Repeat one colour (terracotta, sage, mustard) across cushions, vases and art for cohesion.",
      "8. Don't forget the entryway. A console, a mirror and a small tray for keys makes the first impression count.",
      "9. Swap seasonal accents. Changing cushion covers and one or two decorative pieces twice a year refreshes a home cheaply.",
      "10. Buy fewer, better pieces. A premium piece you love beats five average ones. This is where curated stores like WESTHOME come in — quality that lasts.",
      "The goal isn't a magazine-perfect home. It's a home that reflects how you actually live — comfortable, warm and unmistakably yours.",
    ],
  },
  {
    slug: "choosing-the-perfect-wall-clock",
    title: "How to Choose the Perfect Wall Clock for Every Room",
    excerpt:
      "Wall clocks are both function and art. Here's how to pick the right size, style and finish for your living room, bedroom and kitchen.",
    date: "2026-08-20",
    readMinutes: 4,
    category: "Buying Guide",
    content: [
      "A wall clock is one of the few decor pieces that earns its place — it tells the time and sets the tone of a wall. Choosing well matters more than most people think.",
      "Size first. A common mistake is buying a clock too small for the wall. For a large living room wall, go big: 40-60cm clocks make a statement. For narrow spaces like corridors, a slim 25-30cm design works better.",
      "Match the room's mood. A minimalist white or charcoal clock suits modern, clutter-free spaces. A wooden or brass finish adds warmth to traditional interiors. Black frames read bold and contemporary.",
      "Consider the wall colour. Dark clocks pop on light walls; light or metallic finishes suit dark accent walls. Use contrast to make the clock a focal point.",
      "Silent or ticking? For bedrooms, choose quartz movements with silent sweep mechanisms. Ticking clocks are charming in kitchens and studies but disruptive at night.",
      "Think about readability. Decorative clocks with faint numerals look beautiful but may frustrate. If you need to read it across the room, choose clear, high-contrast numerals.",
      "Don't overload the wall. A clock pairs well with a mirror or a small gallery of frames — but a single, well-proportioned clock can carry a wall on its own.",
      "At WESTHOME, our wall clock collection spans minimalist charcoal consoles to classic white designs — each chosen to be both accurate and artful.",
    ],
  },
  {
    slug: "laundry-room-organization-tips",
    title: "Laundry Room Organization: Smart Storage That Actually Looks Good",
    excerpt:
      "Turn the hardest-working room in the house into a calm, organised space with durable baskets, labelled storage and a simple routine.",
    date: "2026-08-05",
    readMinutes: 4,
    category: "Organization",
    content: [
      "The laundry room does more work than any other space — and usually gets the least design attention. With a few smart choices, it can be both functional and pleasant.",
      "Invest in durable baskets. Unbreakable laundry baskets aren't just about looks — they survive years of daily use, stacking and shifting. Choose ones with sturdy handles and stable bases.",
      "Separate before you sort. Use three distinct baskets (whites, colours, delicates) so sorting happens as clothes come off, not on laundry day.",
      "Keep detergents visible but tidy. One tray or caddy for detergent, softener and stain remover prevents bottle sprawl and makes restocking obvious.",
      "Use vertical space. A slim shelving unit above the machine stores folded linens and supplies without eating floor space.",
      "Label everything. Fabric bins or baskets with simple labels keep towels, bedsheets and cleaning cloths in predictable homes.",
      "Add a folding surface. Even a small counter or wall-mounted fold-down board gives you a flat place to fold — the single biggest usability upgrade.",
      "Light it warmly. Good lighting turns a chore room into a comfortable one. A warm bulb makes the space feel less clinical.",
      "Small habits, big results: run one load daily instead of weekend marathons, and put away folded laundry immediately. Organisation is 20% storage and 80% routine.",
      "Quality matters here more than anywhere — a premium basket or bin bought once beats a cheap one replaced every year. That's the WESTHOME philosophy.",
    ],
  },
  {
    slug: "cushion-cover-styling-guide",
    title: "Cushion Cover Styling: The Simple Formula Designers Use",
    excerpt:
      "Ever wonder why some sofas look styled and others just look piled? There's a formula — and it takes about ten minutes to master.",
    date: "2026-07-25",
    readMinutes: 3,
    category: "Styling Tips",
    content: [
      "Cushion covers are the fastest, cheapest way to transform a room. But most people buy them without a plan and end up with a sofa that looks random. Designers use a simple formula instead.",
      "The 3-2-1 rule. On a three-seater sofa, use three cushions on one side, two in the middle, one on the other side. Asymmetry looks styled; symmetry looks showroom.",
      "Mix sizes. Combine one large square (50x50cm) with smaller squares and a lumbar or round cushion. Varying size adds depth.",
      "Vary texture more than colour. If covers are the same colour, use different fabrics — cotton, linen, velvet, textured weave. Texture is what makes a pile look intentional.",
      "Limit your palette. Two colours plus one neutral. For example, sage green + terracotta + cream. Repeating one colour across covers ties the room together.",
      "Fluff and angle. After arranging, fluff each cushion and angle the two outer ones slightly inward. It takes seconds and photographs beautifully.",
      "Change with seasons. Swap to lighter cotton in summer and warmer velvet in winter. It's the cheapest 'room refresh' there is.",
      "Care tip: wash covers on gentle with cold water and air-dry to keep colours and shapes for years.",
      "A well-styled sofa makes your whole living room feel considered — and it starts with just a few quality covers.",
    ],
  },
];