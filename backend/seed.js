const mongoose = require('mongoose');
const Transaction = require('./models/Transaction');
const Member = require('./models/Member');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mar2025dashboard';

const transactions = [
  { date: 'Feb 26', name: 'RMS',     amount: -40,    transactionHash: 'https://bscscan.com/tx/0x9c93b0fa...' },
  { date: 'Mar 5',  name: 'RMS',     amount: -40,    transactionHash: null },
  { date: 'Mar 5',  name: 'RUH',     amount: -400,   transactionHash: null },
  { date: 'Mar 5',  name: 'KIS',     amount: -100,   transactionHash: null },
  { date: 'Mar 5',  name: 'RUS',     amount: -50,    transactionHash: null },
  { date: 'Mar 5',  name: 'RMS',     amount: -37,    transactionHash: null },
  { date: 'Mar 10', name: 'RMS',     amount: -100,   transactionHash: 'https://etherscan.io/tx/0x43d7b00b...' },
  { date: 'Mar 10', name: 'JGC',     amount: -50,    transactionHash: 'niniste@gmail.com' },
  { date: 'Mar 18', name: 'JGC',     amount: -500,   transactionHash: 'https://etherscan.io/tx/0x40932215...' },
  { date: 'Mar 18', name: 'JGC',     amount: -50,    transactionHash: 'https://etherscan.io/tx/0x04209670...' },
  { date: 'Mar 18', name: 'KMG',     amount: -50,    transactionHash: 'https://etherscan.io/tx/0x9c7715c8...' },
  { date: 'Mar 18', name: 'KIS',     amount: -40,    transactionHash: 'https://etherscan.io/tx/0x0e94afd3...' },
  { date: 'Mar 18', name: 'JGC',     amount: -28,    transactionHash: 'https://etherscan.io/tx/0x0a1ad535...' },
  { date: 'Mar 18', name: 'HHI',     amount: -30,    transactionHash: 'https://etherscan.io/tx/0x053d33a3...' },
  { date: 'Mar 18', name: 'KMG',     amount: -60,    transactionHash: 'https://etherscan.io/tx/0xc05e6279...' },
  { date: 'Mar 18', name: 'RUS',     amount: -47,    transactionHash: 'https://etherscan.io/tx/0xd81bc03c...' },
  { date: 'Mar 18', name: 'GDD',     amount: -40,    transactionHash: 'https://etherscan.io/tx/0x170a5418...' },
  { date: 'Mar 20', name: 'Ironman', amount: -20,    transactionHash: 'https://etherscan.io/tx/0xa65b54e7...' },
  { date: 'Mar 24', name: 'RUH',     amount: -70,    transactionHash: 'https://etherscan.io/tx/0x57d02701...' },
  { date: 'Mar 24', name: 'SMH',     amount: -50,    transactionHash: 'https://etherscan.io/tx/0xa9d490b7...' },
  { date: 'Mar 24', name: 'SMH',     amount: -50,    transactionHash: 'https://etherscan.io/tx/0xf2889959...' },
  { date: 'Mar 24', name: 'SMH',     amount: -15.43, transactionHash: 'https://etherscan.io/tx/0x5a312119...' },
  { date: 'Mar 24', name: 'Ironman', amount: -25,    transactionHash: 'https://etherscan.io/tx/0x399c337e...' },
  { date: 'Mar 25', name: 'RHC',     amount: -80,    transactionHash: null }
];

const members = [
  { member: 'RHC',     pending: 0,        income: -80,     etc: 0,        from3Team: 0,      result: -80 },
  { member: 'HHI',     pending: 0,        income: -30,     etc: 0,        from3Team: -90.11, result: -120.11 },
  { member: 'RMS',     pending: -562.70,  income: -217,    etc: 0,        from3Team: 0,      result: -779.70 },
  { member: 'RUS',     pending: -81.19,   income: -97,     etc: 0,        from3Team: 0,      result: -178.19 },
  { member: 'KMG',     pending: -235.34,  income: -110,    etc: 400,      from3Team: 0,      result: 54.66 },
  { member: 'KHG',     pending: -110.26,  income: 0,       etc: 0,        from3Team: 0,      result: -110.26 },
  { member: 'JGC',     pending: -240,     income: -628,    etc: 0,        from3Team: 0,      result: -868 },
  { member: 'KIS',     pending: -350.65,  income: -140,    etc: 0,        from3Team: 0,      result: -490.65 },
  { member: 'RUH',     pending: 0,        income: -470,    etc: -5200,    from3Team: 0,      result: -5670 },
  { member: 'KDD',     pending: -30.60,   income: 0,       etc: -1002,    from3Team: 0,      result: -1032.60 },
  { member: 'HYR',     pending: -78.70,   income: 0,       etc: 0,        from3Team: 0,      result: -78.70 },
  { member: 'Ironman', pending: 0,        income: -45,     etc: 15562.89, from3Team: 0,      result: 15517.89 },
  { member: 'SMH',     pending: -46,      income: -115.43, etc: -615.55,  from3Team: -75.47, result: -852.45 },
  { member: 'JHH',     pending: -74,      income: -130.20, etc: -776.70,  from3Team: -24,    result: -1004.90 },
  { member: 'HJR',     pending: 0,        income: 0,       etc: -4849.98, from3Team: 0,      result: -4849.98 },
  { member: 'RUC',     pending: 0,        income: 0,       etc: -3518.66, from3Team: 0,      result: -3518.66 },
  { member: 'TOTAL',   pending: -1809.44, income: -2062.63,etc: 0,        from3Team: -189.58,result: -4061.65 }
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Transaction.deleteMany({});
    await Member.deleteMany({});
    console.log('Cleared existing data');

    // Insert transactions
    const insertedTransactions = await Transaction.insertMany(transactions);
    console.log(`Inserted ${insertedTransactions.length} transactions`);

    // Insert members
    const insertedMembers = await Member.insertMany(members);
    console.log(`Inserted ${insertedMembers.length} members`);

    console.log('Seed completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
}

seed();
