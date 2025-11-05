const { connectCred } = require('./db');
const bcrypt = require('bcrypt');

(async () => {
  try {
    const dbCred = await connectCred();
    console.log('Connected to credentials database');
    
    // Test with specific credentials that the user is trying
    const testUsuario = 'evazquez'; // Or whatever usuario you're using
    const testPassword = '1234'; // Try with common test password
    
    console.log('\n=== Testing authentication for:', testUsuario, '===');
    
    const [rows] = await dbCred.query('SELECT * FROM users WHERE usuario = ?', [testUsuario]);
    
    if (rows.length === 0) {
      console.log('❌ User NOT found in database');
    } else {
      const user = rows[0];
      console.log('✅ User found:', user.usuario);
      console.log('   Name:', user.nombre);
      console.log('   Has pass_hash:', !!user.pass_hash);
      console.log('   pass_hash type:', typeof user.pass_hash);
      console.log('   pass_hash length:', user.pass_hash ? user.pass_hash.length : 0);
      
      // Convert Buffer to string
      const passHash = Buffer.isBuffer(user.pass_hash) ? user.pass_hash.toString('utf8') : user.pass_hash;
      console.log('   pass_hash (as string):', passHash.substring(0, 20) + '...');
      
      // Try to compare password
      console.log('\nTesting password:', testPassword);
      try {
        const match = await bcrypt.compare(testPassword, passHash);
        console.log('Password match:', match);
      } catch (e) {
        console.error('Error comparing password:', e.message);
      }
      
      // Try with some common passwords
      const commonPasswords = ['1234', 'password', 'admin', testUsuario];
      console.log('\nTrying common passwords...');
      for (const pwd of commonPasswords) {
        try {
          const match = await bcrypt.compare(pwd, passHash);
          if (match) {
            console.log('✅ MATCH with password:', pwd);
          }
        } catch (e) {
          // skip
        }
      }
    }
    
    // Show all users
    console.log('\n=== All users in database ===');
    const [allUsers] = await dbCred.query('SELECT usuario, nombre FROM users');
    allUsers.forEach(u => console.log('-', u.usuario, ':', u.nombre));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
