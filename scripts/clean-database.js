const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const equalsIdx = trimmed.indexOf('=');
      if (equalsIdx !== -1) {
        const key = trimmed.slice(0, equalsIdx).trim();
        const value = trimmed.slice(equalsIdx + 1).trim();
        process.env[key] = value;
      }
    }
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function cleanDatabase() {
  console.log("=== Starting Pasuyo Database Cleanup ===");

  // 1. Storage cleanup: delete all files in product-images bucket
  console.log("\n1. Cleaning storage bucket 'product-images'...");
  async function listAllFiles(currentPath = '') {
    const { data, error } = await supabase.storage.from('product-images').list(currentPath);
    if (error) {
      console.warn("Storage list error:", error.message);
      return [];
    }
    let files = [];
    for (const item of data || []) {
      const itemPath = currentPath ? `${currentPath}/${item.name}` : item.name;
      if (item.id === null) {
        files = files.concat(await listAllFiles(itemPath));
      } else {
        files.push(itemPath);
      }
    }
    return files;
  }

  const allFiles = await listAllFiles();
  if (allFiles.length > 0) {
    const { error } = await supabase.storage.from('product-images').remove(allFiles);
    if (error) {
      console.error("Error removing storage files:", error.message);
    } else {
      console.log(`✓ Deleted ${allFiles.length} files from storage bucket 'product-images'.`);
    }
  } else {
    console.log("Storage bucket is empty.");
  }

  // 2. Database tables cleanup in strict foreign-key dependency order
  const tables = [
    'notifications',
    'ratings',
    'order_status_history',
    'rider_locations',
    'order_items',
    'orders',
    'cart_items',
    'carts',
    'favorites',
    'search_history',
    'product_images',
    'products',
    'categories',
    'customer_addresses',
    'seller_profiles',
    'rider_profiles',
    'profiles'
  ];

  console.log("\n2. Cleaning public tables...");
  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      console.error(`Failed to clean table '${table}':`, error.message);
    } else {
      console.log(`✓ Cleaned table '${table}'`);
    }
  }

  // 3. Supabase Auth Users cleanup
  console.log("\n3. Deleting auth users...");
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("Failed to list auth users:", listError.message);
  } else {
    const users = usersData.users || [];
    console.log(`Found ${users.length} users to delete.`);
    for (const user of users) {
      const { error: delError } = await supabase.auth.admin.deleteUser(user.id);
      if (delError) {
        console.error(`Failed to delete user ${user.email} (${user.id}):`, delError.message);
      } else {
        console.log(`✓ Deleted auth user: ${user.email} (${user.id})`);
      }
    }
  }

  // 4. Verification
  console.log("\n=== Verifying Clean State ===");
  let hasRemainingData = false;
  for (const table of tables) {
    const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
    console.log(`Table '${table}': ${count ?? 0} rows`);
    if ((count ?? 0) > 0) hasRemainingData = true;
  }

  const { data: remainingUsers } = await supabase.auth.admin.listUsers();
  const userCount = remainingUsers?.users?.length ?? 0;
  console.log(`Auth users remaining: ${userCount}`);
  if (userCount > 0) hasRemainingData = true;

  if (!hasRemainingData) {
    console.log("\n🎉 Complete success! The database is completely clean and empty of user data.");
    console.log("All schemas, functions, triggers, policies, and buckets remain intact.");
  } else {
    console.warn("\n⚠️ Some rows or users could not be deleted.");
  }
}

cleanDatabase().catch(err => {
  console.error("Cleanup script failed:", err);
  process.exit(1);
});
