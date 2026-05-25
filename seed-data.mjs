import postgres from "postgres";

const categories = [
  {
    name: "Plumbing",
    slug: "plumbing",
    description: "Leaks, bathroom fittings, pumps, tanks, and water systems.",
    icon: "wrench",
  },
  {
    name: "Electrical",
    slug: "electrical",
    description: "Wiring, lighting, sockets, inspections, and fault finding.",
    icon: "plug",
  },
  {
    name: "Carpentry",
    slug: "carpentry",
    description: "Furniture, doors, cabinets, fittings, and wood repairs.",
    icon: "hammer",
  },
  {
    name: "Tailoring",
    slug: "tailoring",
    description: "Alterations, custom outfits, uniforms, and fittings.",
    icon: "scissors",
  },
  {
    name: "Painting",
    slug: "painting",
    description: "Interior, exterior, decorative finishes, and touch-ups.",
    icon: "paintbrush",
  },
  {
    name: "Mechanics",
    slug: "mechanics",
    description: "Vehicle diagnostics, servicing, repairs, and inspections.",
    icon: "briefcase",
  },
  {
    name: "AC Repair",
    slug: "ac-repair",
    description: "Cooling faults, installation, servicing, and maintenance.",
    icon: "snowflake",
  },
  {
    name: "Generator Repair",
    slug: "generator-repair",
    description: "Generator servicing, troubleshooting, and part replacement.",
    icon: "zap",
  },
];

const locations = [
  {
    state: "FCT",
    lga: "Abuja Municipal Area Council",
    city: "Abuja",
    area: "Kubwa",
  },
  {
    state: "FCT",
    lga: "Abuja Municipal Area Council",
    city: "Abuja",
    area: "Gwarinpa",
  },
  {
    state: "FCT",
    lga: "Abuja Municipal Area Council",
    city: "Abuja",
    area: "Wuse",
  },
  { state: "FCT", lga: "Bwari", city: "Bwari", area: "Dutse" },
  { state: "FCT", lga: "Gwagwalada", city: "Gwagwalada", area: "Phase 3" },
  {
    state: "Lagos",
    lga: "Lagos Island",
    city: "Lagos",
    area: "Victoria Island",
  },
  { state: "Lagos", lga: "Eti-Osa", city: "Lekki", area: "Lekki Phase 1" },
  { state: "Lagos", lga: "Ikeja", city: "Ikeja", area: "Allen Avenue" },
  { state: "Lagos", lga: "Alimosho", city: "Lagos", area: "Agege" },
  { state: "Kano", lga: "Kano Municipal", city: "Kano", area: "Kano City" },
  { state: "Kano", lga: "Tarauni", city: "Kano", area: "Tarauni" },
  { state: "Rivers", lga: "Port Harcourt", city: "Port Harcourt", area: "GRA" },
  {
    state: "Rivers",
    lga: "Obio-Akpor",
    city: "Port Harcourt",
    area: "Rumuokoro",
  },
  { state: "Kogi", lga: "Lokoja", city: "Lokoja", area: "Ganaja" },
];

const demoUsers = [
  {
    openId: "demo-admin",
    name: "Demo Admin",
    email: "admin.demo@example.com",
    phone: "08030000000",
    whatsappNumber: "08030000000",
    role: "admin",
  },
  {
    openId: "demo-artisan-plumbing",
    name: "Musa Ibrahim",
    email: "musa.plumbing@example.com",
    phone: "08031234567",
    whatsappNumber: "08031234567",
    role: "artisan",
  },
  {
    openId: "demo-artisan-electrical",
    name: "Ada Okafor",
    email: "ada.electrical@example.com",
    phone: "08039876543",
    whatsappNumber: "08039876543",
    role: "artisan",
  },
  {
    openId: "demo-artisan-tailoring",
    name: "Aisha Bello",
    email: "aisha.tailoring@example.com",
    phone: "08035551234",
    whatsappNumber: "08035551234",
    role: "artisan",
  },
  {
    openId: "demo-artisan-painting",
    name: "Chinedu Nwosu",
    email: "chinedu.painting@example.com",
    phone: "08034443333",
    whatsappNumber: "08034443333",
    role: "artisan",
  },
  {
    openId: "demo-artisan-pending",
    name: "Fatima Sani",
    email: "fatima.pending@example.com",
    phone: "08032221111",
    whatsappNumber: "08032221111",
    role: "artisan",
  },
  {
    openId: "demo-artisan-pending-two",
    name: "Tunde Ajayi",
    email: "tunde.pending@example.com",
    phone: "08036667777",
    whatsappNumber: "08036667777",
    role: "artisan",
  },
];

const artisans = [
  {
    openId: "demo-artisan-plumbing",
    businessName: "Musa Plumbing Services",
    categorySlug: "plumbing",
    bio: "Residential and small office plumbing repairs, tank installations, and emergency leak fixes across Abuja.",
    yearsExperience: 8,
    state: "FCT",
    lga: "Abuja Municipal Area Council",
    city: "Abuja",
    area: "Kubwa",
    serviceAreas: "Kubwa, Gwarinpa, Dutse, Wuse",
    startingPrice: 7000,
    verificationStatus: "verified",
    approvalStatus: "approved",
    isFeatured: true,
  },
  {
    openId: "demo-artisan-electrical",
    businessName: "Ada Bright Electricals",
    categorySlug: "electrical",
    bio: "Certified electrician for wiring, lighting upgrades, inverter points, and socket repairs in Lagos.",
    yearsExperience: 6,
    state: "Lagos",
    lga: "Ikeja",
    city: "Ikeja",
    area: "Allen Avenue",
    serviceAreas: "Ikeja, Agege, Lekki, Victoria Island",
    startingPrice: 10000,
    verificationStatus: "verified",
    approvalStatus: "approved",
    isFeatured: true,
  },
  {
    openId: "demo-artisan-tailoring",
    businessName: "Aisha Stitches",
    categorySlug: "tailoring",
    bio: "Native wears, alterations, office uniforms, and express fittings for clients in Kano.",
    yearsExperience: 10,
    state: "Kano",
    lga: "Kano Municipal",
    city: "Kano",
    area: "Kano City",
    serviceAreas: "Kano City, Tarauni",
    startingPrice: 5000,
    verificationStatus: "verified",
    approvalStatus: "approved",
    isFeatured: true,
  },
  {
    openId: "demo-artisan-painting",
    businessName: "Chinedu Paint Works",
    categorySlug: "painting",
    bio: "Clean interior and exterior painting with neat finishing for apartments, offices, and shops.",
    yearsExperience: 5,
    state: "Rivers",
    lga: "Port Harcourt",
    city: "Port Harcourt",
    area: "GRA",
    serviceAreas: "GRA, Rumuokoro, Port Harcourt",
    startingPrice: 25000,
    verificationStatus: "verified",
    approvalStatus: "approved",
    isFeatured: false,
  },
  {
    openId: "demo-artisan-pending",
    businessName: "Fatima AC Care",
    categorySlug: "ac-repair",
    bio: "AC servicing, gas refill, and installation requests awaiting admin review.",
    yearsExperience: 4,
    state: "FCT",
    lga: "Abuja Municipal Area Council",
    city: "Abuja",
    area: "Wuse",
    serviceAreas: "Wuse, Gwarinpa",
    startingPrice: 12000,
    verificationStatus: "pending",
    approvalStatus: "pending",
    isFeatured: false,
  },
  {
    openId: "demo-artisan-pending-two",
    businessName: "Tunde Generator Repairs",
    categorySlug: "generator-repair",
    bio: "Portable and medium generator repairs awaiting verification.",
    yearsExperience: 7,
    state: "Lagos",
    lga: "Alimosho",
    city: "Lagos",
    area: "Agege",
    serviceAreas: "Agege, Ikeja, Alimosho",
    startingPrice: 15000,
    verificationStatus: "pending",
    approvalStatus: "pending",
    isFeatured: false,
  },
];

const serviceRequests = [
  {
    clientName: "Nneka Eze",
    clientPhone: "08031110001",
    clientWhatsapp: "08031110001",
    categorySlug: "plumbing",
    state: "FCT",
    lga: "Abuja Municipal Area Council",
    city: "Abuja",
    area: "Gwarinpa",
    description: "Kitchen sink pipe is leaking and needs same-day repair.",
    urgency: "urgent",
    budgetRange: "8000-15000",
  },
  {
    clientName: "Samuel Johnson",
    clientPhone: "08031110002",
    clientWhatsapp: "08031110002",
    categorySlug: "electrical",
    state: "Lagos",
    lga: "Eti-Osa",
    city: "Lekki",
    area: "Lekki Phase 1",
    description: "Need two new light fixtures installed in a small office.",
    urgency: "medium",
    budgetRange: "15000-30000",
  },
  {
    clientName: "Hauwa Yusuf",
    clientPhone: "08031110003",
    clientWhatsapp: "08031110003",
    categorySlug: "tailoring",
    state: "Kano",
    lga: "Tarauni",
    city: "Kano",
    area: "Tarauni",
    description: "Need alterations for three dresses before the weekend.",
    urgency: "high",
    budgetRange: "5000-12000",
  },
];

const reports = [
  {
    artisanOpenId: "demo-artisan-plumbing",
    reporterName: "Grace Okon",
    reporterPhone: "08039990001",
    reason: "late-response",
    description:
      "Client says the artisan has not responded after initial contact.",
    status: "open",
    adminNotes: "Demo report for admin workflow testing.",
  },
  {
    artisanOpenId: "demo-artisan-electrical",
    reporterName: "Ibrahim Lawal",
    reporterPhone: "08039990002",
    reason: "pricing-dispute",
    description: "Client wants admin to review the quoted call-out fee.",
    status: "investigating",
    adminNotes: "Demo investigation item.",
  },
];

async function queryOne(connection, sql, params = []) {
  const [rows] = await connection.execute(sql, params);
  return rows[0];
}

function createPostgresConnection(url) {
  const sql = postgres(url, { max: 1, ssl: "require" });

  return {
    async execute(query, params = []) {
      let index = 0;
      const preparedQuery = query.replace(/\?/g, () => `$${++index}`);
      const rows = await sql.unsafe(preparedQuery, params);
      return [rows];
    },
    async end() {
      await sql.end();
    },
  };
}

async function cleanupDemoData(connection) {
  await connection.execute(
    `DELETE FROM service_requests WHERE client_phone IN (${serviceRequests
      .map(() => "?")
      .join(",")})`,
    serviceRequests.map(request => request.clientPhone)
  );
  await connection.execute(
    `DELETE FROM reports WHERE reporter_phone IN (${reports
      .map(() => "?")
      .join(",")})`,
    reports.map(report => report.reporterPhone)
  );

  const [demoUsersRows] = await connection.execute(
    "SELECT id FROM users WHERE open_id LIKE 'demo-%'"
  );
  const userIds = demoUsersRows.map(user => user.id);

  if (!userIds.length) return;

  const placeholders = userIds.map(() => "?").join(",");
  const [demoArtisansRows] = await connection.execute(
    `SELECT id FROM artisan_profiles WHERE user_id IN (${placeholders})`,
    userIds
  );
  const artisanIds = demoArtisansRows.map(artisan => artisan.id);

  if (artisanIds.length) {
    const artisanPlaceholders = artisanIds.map(() => "?").join(",");
    await connection.execute(
      `DELETE FROM featured_artisans WHERE artisan_id IN (${artisanPlaceholders})`,
      artisanIds
    );
    await connection.execute(
      `DELETE FROM reports WHERE reported_artisan_id IN (${artisanPlaceholders})`,
      artisanIds
    );
    await connection.execute(
      `DELETE FROM portfolio_images WHERE artisan_id IN (${artisanPlaceholders})`,
      artisanIds
    );
  }

  await connection.execute(
    `DELETE FROM artisan_profiles WHERE user_id IN (${placeholders})`,
    userIds
  );
  await connection.execute(
    `DELETE FROM users WHERE id IN (${placeholders})`,
    userIds
  );
}

async function seedCategories(connection) {
  for (const category of categories) {
    await connection.execute(
      `INSERT INTO categories (name, slug, description, icon, is_active)
       VALUES (?, ?, ?, ?, true)
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         icon = EXCLUDED.icon,
         is_active = true,
         updated_at = NOW()`,
      [category.name, category.slug, category.description, category.icon]
    );
  }
}

async function seedLocations(connection) {
  for (const location of locations) {
    const existing = await queryOne(
      connection,
      `SELECT id FROM locations
       WHERE state = ? AND lga = ? AND city = ? AND area IS NOT DISTINCT FROM ?
       LIMIT 1`,
      [location.state, location.lga, location.city, location.area]
    );

    if (!existing) {
      await connection.execute(
        "INSERT INTO locations (state, lga, city, area) VALUES (?, ?, ?, ?)",
        [location.state, location.lga, location.city, location.area]
      );
    }
  }
}

async function seedUsers(connection) {
  for (const user of demoUsers) {
    await connection.execute(
      `INSERT INTO users
        (open_id, name, email, phone, whatsapp_number, login_method, role, status, last_signed_in)
       VALUES (?, ?, ?, ?, ?, 'demo-seed', ?, 'active', NOW())
       ON CONFLICT (open_id) DO UPDATE SET
         name = EXCLUDED.name,
         email = EXCLUDED.email,
         phone = EXCLUDED.phone,
         whatsapp_number = EXCLUDED.whatsapp_number,
         role = EXCLUDED.role,
         status = 'active',
         last_signed_in = NOW(),
         updated_at = NOW()`,
      [
        user.openId,
        user.name,
        user.email,
        user.phone,
        user.whatsappNumber,
        user.role,
      ]
    );
  }
}

async function getCategoryMap(connection) {
  const [rows] = await connection.execute("SELECT id, slug FROM categories");
  return new Map(rows.map(category => [category.slug, category.id]));
}

async function getUserMap(connection) {
  const [rows] = await connection.execute(
    "SELECT id, open_id AS \"openId\" FROM users WHERE open_id LIKE 'demo-%'"
  );
  return new Map(rows.map(user => [user.openId, user.id]));
}

async function getArtisanMap(connection) {
  const [rows] = await connection.execute(
    `SELECT artisan_profiles.id, users.open_id AS "openId"
     FROM artisan_profiles
     INNER JOIN users ON artisan_profiles.user_id = users.id
     WHERE users.open_id LIKE 'demo-%'`
  );
  return new Map(rows.map(artisan => [artisan.openId, artisan.id]));
}

async function seedArtisans(connection, categoryBySlug, userByOpenId) {
  for (const artisan of artisans) {
    const userId = userByOpenId.get(artisan.openId);
    const categoryId = categoryBySlug.get(artisan.categorySlug);

    if (!userId || !categoryId) {
      throw new Error(`Missing user or category for ${artisan.businessName}`);
    }

    await connection.execute(
      `INSERT INTO artisan_profiles
        (user_id, business_name, category_id, bio, years_experience, state, lga, city, area,
         service_areas, starting_price, verification_status, is_featured, approval_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        artisan.businessName,
        categoryId,
        artisan.bio,
        artisan.yearsExperience,
        artisan.state,
        artisan.lga,
        artisan.city,
        artisan.area,
        artisan.serviceAreas,
        artisan.startingPrice,
        artisan.verificationStatus,
        artisan.isFeatured,
        artisan.approvalStatus,
      ]
    );
  }
}

async function seedFeaturedArtisans(
  connection,
  categoryBySlug,
  artisanByOpenId
) {
  const featured = artisans.filter(artisan => artisan.isFeatured);

  for (const [index, artisan] of featured.entries()) {
    const artisanId = artisanByOpenId.get(artisan.openId);
    const categoryId = categoryBySlug.get(artisan.categorySlug);

    await connection.execute(
      `INSERT INTO featured_artisans (artisan_id, category_id, display_order)
       VALUES (?, ?, ?)`,
      [artisanId, categoryId, index + 1]
    );
  }
}

async function seedServiceRequests(connection, categoryBySlug) {
  for (const request of serviceRequests) {
    const categoryId = categoryBySlug.get(request.categorySlug);

    await connection.execute(
      `INSERT INTO service_requests
        (client_name, client_phone, client_whatsapp, category_id, state, lga, city, area,
         description, urgency, budget_range, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')`,
      [
        request.clientName,
        request.clientPhone,
        request.clientWhatsapp,
        categoryId,
        request.state,
        request.lga,
        request.city,
        request.area,
        request.description,
        request.urgency,
        request.budgetRange,
      ]
    );
  }
}

async function seedReports(connection, artisanByOpenId) {
  for (const report of reports) {
    const reportedArtisanId = artisanByOpenId.get(report.artisanOpenId);

    await connection.execute(
      `INSERT INTO reports
        (reported_artisan_id, reporter_name, reporter_phone, reason, description, status, admin_notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        reportedArtisanId,
        report.reporterName,
        report.reporterPhone,
        report.reason,
        report.description,
        report.status,
        report.adminNotes,
      ]
    );
  }
}

async function seedDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to seed demo data.");
  }

  const connection = createPostgresConnection(process.env.DATABASE_URL);

  try {
    console.log("Starting demo database seed...");
    await cleanupDemoData(connection);
    await seedCategories(connection);
    await seedLocations(connection);
    await seedUsers(connection);

    const categoryBySlug = await getCategoryMap(connection);
    const userByOpenId = await getUserMap(connection);

    await seedArtisans(connection, categoryBySlug, userByOpenId);

    const artisanByOpenId = await getArtisanMap(connection);

    await seedFeaturedArtisans(connection, categoryBySlug, artisanByOpenId);
    await seedServiceRequests(connection, categoryBySlug);
    await seedReports(connection, artisanByOpenId);

    console.log("Demo database seed completed.");
    console.log(`Categories: ${categories.length}`);
    console.log(`Locations: ${locations.length}`);
    console.log(`Demo users: ${demoUsers.length}`);
    console.log(`Artisans: ${artisans.length}`);
    console.log(`Featured artisans: ${featuredArtisansCount()}`);
    console.log(`Service requests: ${serviceRequests.length}`);
    console.log(`Reports: ${reports.length}`);
  } finally {
    await connection.end();
  }
}

function featuredArtisansCount() {
  return artisans.filter(artisan => artisan.isFeatured).length;
}

seedDatabase().catch(error => {
  console.error("Demo database seed failed:", error);
  process.exitCode = 1;
});
