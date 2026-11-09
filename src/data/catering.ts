export type CateringPackage = {
  id: string;
  name: string;
  tagline: string;
  feeds: string;
  priceFrom: number;
  includes: string[];
  image: string;
  badge?: string;
};

export const cateringPackages: CateringPackage[] = [
  {
    id: "sunday-table",
    name: "The Sunday Table",
    tagline: "The plate Plano comes back for, scaled up.",
    feeds: "Feeds 10–12",
    priceFrom: 219,
    badge: "Most requested",
    image: "/img/oxtail-pasta.jpg",
    includes: [
      "Braised oxtails with rice and gravy",
      "Candied yams and collard greens",
      "Baked three-cheese mac",
      "Cornbread, baked the morning of",
    ],
  },
  {
    id: "boil",
    name: "Boil for the Block",
    tagline: "Cajun boil by the tray, butter sauce included.",
    feeds: "Feeds 12–15",
    priceFrom: 289,
    image: "/img/menu-plate.jpg",
    includes: [
      "Shrimp boil with sausage, corn and potato",
      "Mr. Cajun butter on the side — by the quart",
      "24 wings, two sauces",
      "White bread, lemon and house sauce",
    ],
  },
  {
    id: "daq-pack",
    name: "The Daq Pack",
    tagline: "The combo that started the group chat.",
    feeds: "Feeds 4–6",
    priceFrom: 50.99,
    badge: "Signature",
    image: "/img/hero.jpg",
    includes: [
      "10 crispy fried shrimp",
      "2 oxtail eggrolls",
      "6 wings in your choice of sauce",
      "4 Cajun butter corn and oxtail fries",
    ],
  },
  {
    id: "game-day",
    name: "Game Day Wings",
    tagline: "Fifty wings, three sauces, no leftovers.",
    feeds: "Feeds 10–12",
    priceFrom: 129,
    image: "/img/wings.jpg",
    includes: [
      "50 wings, tossed to order",
      "Three sauces — pick from the wing list",
      "Seasoned crinkle fries",
      "Celery, ranch and plenty of napkins",
    ],
  },
];

export const cateringExtras = [
  {
    name: "Cajun fried corn tray",
    note: "Tossed in Mr. Cajun butter",
    price: null,
  },
  { name: "Collard greens tray", note: "Simmered with smoked turkey", price: null },
  { name: "Candied yams tray", note: "Brown sugar, warm spice", price: null },
  { name: "Banana pudding tray", note: "Serves about 12", price: 45.99 },
  { name: "Cookie pudding tray", note: "Serves about 12", price: 45.99 },
  { name: "Gallon daqs", note: "Ask about flavors · 21+ with ID", price: null },
];

export const cateringSteps = [
  {
    step: "01",
    title: "Tell us the date",
    copy: "Headcount, drop-off time and the address — or say you're picking it up on Preston Road.",
  },
  {
    step: "02",
    title: "We build the tray list",
    copy: "The kitchen puts together a list sized to your crowd and sends back a firm quote, usually the same business day.",
  },
  {
    step: "03",
    title: "Confirm and pay",
    copy: "Catering and call-in orders are paid in full when the order is placed. That's what holds your date and your trays.",
  },
  {
    step: "04",
    title: "We cook it that morning",
    copy: "Oxtails braise overnight, cornbread comes out fresh, and everything gets packed hot for pickup or delivery.",
  },
];

export const cateringFaqs = [
  {
    q: "How much notice do you need?",
    a: "48 hours for trays and wing orders. Boils and full spreads need about a week so the kitchen can order the shrimp and sausage properly.",
  },
  {
    q: "Is there a minimum?",
    a: "Trays are built for ten or more. For smaller crowds, the Daq Pack is the easiest way in — or order individual plates online.",
  },
  {
    q: "Do you deliver catering?",
    a: "Yes, across Plano, Frisco and North Dallas for a delivery fee. Pickup at 8700 Preston Road, Suite 127 is free and usually faster.",
  },
  {
    q: "Can we get daqs for the party?",
    a: "Gallon daqs are available with the same 21+ rule as the bar — valid ID at pickup or delivery, every time. Ask us about flavors when you call.",
  },
  {
    q: "Can you work around allergies or swaps?",
    a: "Tell us in the notes and we'll be straight with you about what the kitchen can and can't do. Some swaps are easy; some change the dish too much.",
  },
];
