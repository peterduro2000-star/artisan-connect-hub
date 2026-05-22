import mysql from "mysql2/promise";

const categories = [
  { name: "Plumbing", slug: "plumbing", description: "Pipe repairs, bathroom fittings, water systems", icon: "🔧" },
  { name: "Electrical", slug: "electrical", description: "Wiring, installations, repairs", icon: "⚡" },
  { name: "Carpentry", slug: "carpentry", description: "Furniture, doors, custom woodwork", icon: "🪵" },
  { name: "Tailoring", slug: "tailoring", description: "Sewing, alterations, custom clothing", icon: "✂️" },
  { name: "Painting", slug: "painting", description: "Interior and exterior painting", icon: "🎨" },
  { name: "Mechanics", slug: "mechanics", description: "Car repairs and maintenance", icon: "🔩" },
  { name: "AC Repair", slug: "ac-repair", description: "Air conditioning installation and repair", icon: "❄️" },
  { name: "Generator Repair", slug: "generator-repair", description: "Generator maintenance and repair", icon: "⚙️" },
];

const nigeriaLocations = [
  // Abuja
  { state: "FCT", lga: "Abuja Municipal Area Council", city: "Abuja", area: "Kubwa" },
  { state: "FCT", lga: "Abuja Municipal Area Council", city: "Abuja", area: "Gwarinpa" },
  { state: "FCT", lga: "Abuja Municipal Area Council", city: "Abuja", area: "Dutse" },
  { state: "FCT", lga: "Abuja Municipal Area Council", city: "Abuja", area: "Bwari" },
  { state: "FCT", lga: "Abuja Municipal Area Council", city: "Abuja", area: "Wuse" },

  // Lagos
  { state: "Lagos", lga: "Lagos Island", city: "Lagos", area: "Victoria Island" },
  { state: "Lagos", lga: "Lagos Island", city: "Lagos", area: "Ikoyi" },
  { state: "Lagos", lga: "Ikeja", city: "Lagos", area: "Ikeja" },
  { state: "Lagos", lga: "Ikeja", city: "Lagos", area: "Lekki" },
  { state: "Lagos", lga: "Alimosho", city: "Lagos", area: "Agege" },

  // Kano
  { state: "Kano", lga: "Kano Municipal", city: "Kano", area: "Kano City" },
  { state: "Kano", lga: "Kano Municipal", city: "Kano", area: "Tarauni" },

  // Kogi
  { state: "Kogi", lga: "Lokoja", city: "Lokoja", area: "Lokoja" },

  // Rivers
  { state: "Rivers", lga: "Port Harcourt", city: "Port Harcourt", area: "Port Harcourt" },
];

async function seedDatabase() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    console.log("🌱 Starting database seeding...");

    // Seed categories
    console.log("📁 Seeding categories...");
    for (const category of categories) {
      await connection.execute(
        "INSERT IGNORE INTO categories (name, slug, description, icon, isActive) VALUES (?, ?, ?, ?, true)",
        [category.name, category.slug, category.description, category.icon]
      );
    }
    console.log(`✅ Seeded ${categories.length} categories`);

    // Seed locations
    console.log("📍 Seeding locations...");
    for (const location of nigeriaLocations) {
      await connection.execute(
        "INSERT IGNORE INTO locations (state, lga, city, area) VALUES (?, ?, ?, ?)",
        [location.state, location.lga, location.city, location.area]
      );
    }
    console.log(`✅ Seeded ${nigeriaLocations.length} locations`);

    console.log("✨ Database seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  } finally {
    await connection.end();
  }
}

seedDatabase();
