/**
 * Migration Script: Convert Portfolio Holdings to Transactions
 * 
 * This script creates initial BUY transactions for all existing portfolio holdings.
 * It should be run once after implementing the transaction tracking system.
 * 
 * Usage: npm run migrate:transactions
 */

import { MongoClient } from 'mongodb';
import clientPromise from '../lib/mongodb';
import { getUserPortfolio } from '../lib/userPortfolio';
import { createTransaction } from '../lib/transactionModel';

interface PortfolioHolding {
  symbol: string;
  shares: number;
  avgBuy: number;
  purchaseDate?: Date;
}

async function migrateToTransactions() {
  console.log('🚀 Starting migration: Portfolio Holdings → Transactions\n');

  const client: MongoClient = await clientPromise;
  const db = client.db(process.env.MONGODB_DB ?? 'portfolioTrack');
  const usersCollection = db.collection('users');

  try {
    // Get all users
    const users = await usersCollection.find({}).toArray();
    console.log(`📊 Found ${users.length} users to migrate\n`);

    let totalTransactionsCreated = 0;
    let usersWithHoldings = 0;
    let usersSkipped = 0;

    for (const user of users) {
      const userId = user.email;
      console.log(`Processing user: ${userId}`);

      try {
        // Get user's portfolio
        const portfolio: PortfolioHolding[] = await getUserPortfolio(userId);

        if (portfolio.length === 0) {
          console.log(`  ⏭️  No holdings found - skipping\n`);
          usersSkipped++;
          continue;
        }

        console.log(`  📦 Found ${portfolio.length} holdings`);
        usersWithHoldings++;

        // Check if transactions already exist for this user
        const transactionsCollection = db.collection('transactions');
        const existingCount = await transactionsCollection.countDocuments({ userId });

        if (existingCount > 0) {
          console.log(`  ⚠️  User already has ${existingCount} transactions - skipping to avoid duplicates\n`);
          usersSkipped++;
          continue;
        }

        // Create BUY transaction for each holding
        for (const holding of portfolio) {
          try {
            await createTransaction(userId, {
              symbol: holding.symbol.toUpperCase(),
              transactionType: 'BUY',
              shares: holding.shares,
              pricePerShare: holding.avgBuy,
              transactionDate: holding.purchaseDate || new Date('2024-01-01'), // Default to Jan 1, 2024 if no date
              notes: 'Migrated from portfolio holdings',
            });

            totalTransactionsCreated++;
            console.log(`    ✅ Created BUY transaction for ${holding.symbol} (${holding.shares} shares @ ₨${holding.avgBuy})`);
          } catch (txError) {
            console.error(`    ❌ Failed to create transaction for ${holding.symbol}:`, txError);
          }
        }

        console.log(`  ✨ Created ${portfolio.length} transactions for ${userId}\n`);
      } catch (userError) {
        console.error(`  ❌ Error processing user ${userId}:`, userError);
        console.log('');
      }
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 Migration Summary:');
    console.log(`   Total Users: ${users.length}`);
    console.log(`   Users with Holdings: ${usersWithHoldings}`);
    console.log(`   Users Skipped: ${usersSkipped}`);
    console.log(`   Total Transactions Created: ${totalTransactionsCreated}`);
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ Migration completed successfully!\n');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    // MongoDB connection is managed by clientPromise, no need to close
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateToTransactions()
    .then(() => {
      console.log('✨ All done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { migrateToTransactions };
