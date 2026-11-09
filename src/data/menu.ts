export type Addon = {
  id: string;
  label: string;
  price: number;
};

export type MenuCategory = {
  id: string;
  name: string;
  blurb: string;
  note?: string;
};

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  tags?: string[];
  popular?: boolean;
  spicy?: boolean;
  addons?: Addon[];
  /** Gradient used for items without a photo (daiquiris). */
  swatch?: [string, string];
};

export const categories: MenuCategory[] = [
  {
    id: "oxtails",
    name: "Oxtails & Plates",
    blurb: "Slow-braised, smothered and plated with the classics.",
  },
  {
    id: "cajun",
    name: "Cajun & Seafood",
    blurb: "Boils, baskets and cornmeal-fried favorites.",
  },
  {
    id: "sides",
    name: "Sides",
    blurb: "The supporting cast that keeps stealing the show.",
  },
  {
    id: "daqs",
    name: "Frozen Daqs",
    blurb: "Blended when you order. 21+ with valid ID.",
    note: "Please drink responsibly.",
  },
  {
    id: "specials",
    name: "Weekday Lunch",
    blurb: "Monday–Friday, 12–4 PM. Everything $15 and under.",
    note: "Dine-in or takeout, while it lasts.",
  },
];

export const menu: MenuItem[] = [
  // Oxtails & plates
  {
    id: "oxtail-pasta",
    name: "Oxtail Pasta",
    description:
      "Penne tossed in slow-braised oxtail gravy with peppers, onions and melted cheese.",
    price: 25.99,
    category: "oxtails",
    image: "/img/oxtail-pasta.jpg",
    tags: ["Most ordered"],
    popular: true,
    addons: [
      { id: "extra-oxtail", label: "Extra oxtail", price: 8 },
      { id: "garlic-bread", label: "Garlic bread", price: 3 },
    ],
  },
  {
    id: "turkey-neck-plate",
    name: "Turkey Neck Plate",
    description:
      "Smothered turkey neck with rice, candied yams, collard greens and a slice of cornbread.",
    price: 28.99,
    category: "oxtails",
    tags: ["Plate"],
  },
  {
    id: "turkey-neck-beans",
    name: "Turkey Neck & Beans",
    description: "Fall-off-the-bone turkey neck served over beans and rice.",
    price: 25.99,
    category: "oxtails",
  },
  {
    id: "turkey-neck-boil",
    name: "Turkey Neck Boil",
    description:
      "Turkey neck with corn, potato and a Cajun boiled egg in our house butter sauce.",
    price: 24.99,
    category: "oxtails",
    spicy: true,
  },
  {
    id: "veggie-plate",
    name: "Veggie Plate",
    description:
      "Pick three sides with a slice of cornbread. The lighter lunch, no compromise.",
    price: 13.99,
    category: "oxtails",
    tags: ["Lite lunch"],
  },

  // Cajun & seafood
  {
    id: "cajun-boiled-shrimp",
    name: "Cajun Boiled Shrimp",
    description:
      "One pound of shrimp in our Cajun butter bath with corn and potato.",
    price: 25.99,
    category: "cajun",
    image: "/img/menu-plate.jpg",
    tags: ["Most ordered"],
    popular: true,
    spicy: true,
    addons: [
      { id: "butter-sauce", label: "Extra Mr. Cajun butter", price: 1.5 },
      { id: "sausage", label: "Add sausage", price: 4.5 },
    ],
  },
  {
    id: "ten-shrimp",
    name: "10 PC Shrimp",
    description:
      "Ten shrimp fried to order and dusted with Cajun seasoning.",
    price: 16.99,
    category: "cajun",
    addons: [{ id: "extra-sauce", label: "Extra house sauce", price: 1 }],
  },
  {
    id: "catfish-fries",
    name: "3 PC Catfish & Fries",
    description:
      "Cornmeal-crusted catfish with seasoned fries and house tartar.",
    price: 28.99,
    category: "cajun",
    image: "/img/catfish.jpg",
    tags: ["Most ordered"],
    popular: true,
    addons: [{ id: "extra-fillet", label: "Extra fillet", price: 7 }],
  },
  {
    id: "gumbo",
    name: "Gumbo",
    description:
      "Louisiana classic with shrimp, crab and andouille, ladled over rice.",
    price: 18.99,
    category: "cajun",
    image: "/img/gumbo.jpg",
    tags: ["House favorite"],
    spicy: true,
    addons: [
      { id: "extra-rice", label: "Extra rice", price: 2 },
      { id: "cornbread", label: "Cornbread", price: 3 },
    ],
  },
  {
    id: "oxtail-eggrolls",
    name: "Oxtail Eggrolls",
    description:
      "Braised oxtail and cheese rolled tight, fried golden, finished with Cajun cream.",
    price: 13.99,
    category: "cajun",
    image: "/img/plate-2.jpg",
    tags: ["Most ordered"],
    popular: true,
  },
  {
    id: "wing-basket",
    name: "6 PC Wing Basket",
    description:
      "Six wings tossed in your sauce of choice, served with seasoned fries.",
    price: 12.99,
    category: "cajun",
    image: "/img/wings.jpg",
    addons: [
      { id: "twelve-wings", label: "Make it 12 wings", price: 10.5 },
      { id: "extra-sauce", label: "Extra sauce", price: 1 },
    ],
  },

  // Sides
  {
    id: "cajun-fried-corn",
    name: "Cajun Fried Corn",
    description: "Fried corn tossed in our famous Mr. Cajun butter sauce.",
    price: 7.99,
    category: "sides",
    tags: ["Most ordered"],
    popular: true,
    spicy: true,
  },
  {
    id: "mac-cheese",
    name: "Three-Cheese Mac",
    description: "Baked macaroni with a three-cheese pull.",
    price: 6.99,
    category: "sides",
  },
  {
    id: "candied-yams",
    name: "Candied Yams",
    description: "Sweet potatoes candied low with brown sugar and warm spice.",
    price: 6.99,
    category: "sides",
  },
  {
    id: "collard-greens",
    name: "Collard Greens",
    description: "Simmered slow with smoked turkey and a little heat.",
    price: 6.99,
    category: "sides",
  },
  {
    id: "cornbread",
    name: "Cornbread",
    description: "Sweet, golden and baked fresh every day.",
    price: 3.99,
    category: "sides",
  },

  // Daiquiris
  {
    id: "strawberry-daq",
    name: "Strawberry Daiquiri",
    description: "Frozen strawberry, blended when you order. 12 oz.",
    price: 10.99,
    category: "daqs",
    tags: ["21+"],
    swatch: ["#f4739c", "#c81f52"],
    addons: [{ id: "size-24", label: "Make it 24 oz", price: 5 }],
  },
  {
    id: "mango-daq",
    name: "Mango Daiquiri",
    description: "Ripe mango and lime, spun thick and cold. 12 oz.",
    price: 10.99,
    category: "daqs",
    tags: ["21+"],
    swatch: ["#f8c25c", "#e07a1f"],
    addons: [{ id: "size-24", label: "Make it 24 oz", price: 5 }],
  },
  {
    id: "blue-razz-daq",
    name: "Blue Razz Daiquiri",
    description: "Blue raspberry with a tart finish. 12 oz.",
    price: 10.99,
    category: "daqs",
    tags: ["21+"],
    swatch: ["#59c8f5", "#1361b8"],
    addons: [{ id: "size-24", label: "Make it 24 oz", price: 5 }],
  },
  {
    id: "peach-daq",
    name: "Peach Daiquiri",
    description: "Georgia peach, bright and smooth. 12 oz.",
    price: 10.99,
    category: "daqs",
    tags: ["21+"],
    swatch: ["#ffb98a", "#e2622f"],
    addons: [{ id: "size-24", label: "Make it 24 oz", price: 5 }],
  },

  // Weekday lunch
  {
    id: "lunch-pasta",
    name: "Lunch Oxtail Pasta",
    description: "A smaller bowl of our oxtail pasta. Weekdays only.",
    price: 14.99,
    category: "specials",
    image: "/img/oxtail-pasta.jpg",
    tags: ["Lunch"],
  },
  {
    id: "lunch-wings",
    name: "6 Wings & Fries",
    description: "Six wings, seasoned fries, your sauce.",
    price: 12,
    category: "specials",
    image: "/img/wings.jpg",
  },
  {
    id: "lunch-catfish",
    name: "1 PC Catfish & Fries",
    description: "One cornmeal-crusted fillet with seasoned fries.",
    price: 12,
    category: "specials",
    image: "/img/catfish.jpg",
  },
  {
    id: "lunch-shrimp-fries",
    name: "10 PC Shrimp & Fries",
    description: "Ten fried shrimp with seasoned fries.",
    price: 12,
    category: "specials",
  },
  {
    id: "lunch-boil",
    name: "½ LB Shrimp Boil",
    description: "Half pound shrimp with sausage, potato and corn.",
    price: 12,
    category: "specials",
    image: "/img/menu-plate.jpg",
    spicy: true,
  },
  {
    id: "lunch-veggie",
    name: "Veggie Lunch",
    description: "Mac and cheese, yams, greens and cornbread.",
    price: 11.99,
    category: "specials",
  },
  {
    id: "chicken-waffle",
    name: "Chicken & Waffle",
    description: "Crispy chicken and a golden waffle. Weekdays 12–4 PM.",
    price: 14.99,
    category: "specials",
    tags: ["Lunch"],
  },
];

export const popularItems = menu.filter((item) => item.popular);
