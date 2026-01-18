// Helper script to stop the server on port 5000
const { exec } = require('child_process');
const os = require('os');

const platform = os.platform();
const PORT = process.env.PORT || 5000;

function killProcess(pid) {
  return new Promise((resolve) => {
    if (platform === 'win32') {
      exec(`taskkill /F /PID ${pid}`, (error) => {
        if (error) {
          // Try with admin privileges message
          if (error.message.includes('Access is denied')) {
            console.log(`⚠️  Need admin privileges to kill process ${pid}`);
            console.log(`💡 Try running: taskkill /F /PID ${pid}`);
            console.log(`   Or run this terminal as Administrator`);
          } else {
            console.log(`Process ${pid} may have already been terminated`);
          }
        } else {
          console.log(`✅ Process ${pid} killed successfully`);
        }
        resolve();
      });
    } else {
      exec(`kill -9 ${pid}`, (error) => {
        if (error) {
          console.log(`Process ${pid} may have already been terminated`);
        } else {
          console.log(`✅ Process ${pid} killed successfully`);
        }
        resolve();
      });
    }
  });
}

if (platform === 'win32') {
  // Windows
  exec(`netstat -ano | findstr :${PORT}`, (error, stdout) => {
    if (error || !stdout.trim()) {
      console.log(`✅ No process found on port ${PORT}`);
      console.log('Port is free! You can start the server now.');
      return;
    }
    
    const lines = stdout.split('\n').filter(line => line.trim());
    const pids = new Set();
    
    for (const line of lines) {
      if (line.includes('LISTENING')) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && !isNaN(pid)) {
          pids.add(pid);
        }
      }
    }
    
    if (pids.size === 0) {
      console.log(`✅ No listening process found on port ${PORT}`);
      console.log('Port is free! You can start the server now.');
      return;
    }
    
    console.log(`Found ${pids.size} process(es) on port ${PORT}`);
    Promise.all(Array.from(pids).map(pid => {
      console.log(`Attempting to kill process ${pid}...`);
      return killProcess(pid);
    })).then(() => {
      console.log('\n✅ Done! Try starting the server again: node server.js');
    });
  });
} else {
  // Linux/Mac
  exec(`lsof -ti:${PORT}`, (error, stdout) => {
    if (error || !stdout.trim()) {
      console.log(`✅ No process found on port ${PORT}`);
      console.log('Port is free! You can start the server now.');
      return;
    }
    
    const pids = stdout.trim().split('\n').filter(pid => pid);
    console.log(`Found ${pids.length} process(es) on port ${PORT}`);
    
    Promise.all(pids.map(pid => {
      console.log(`Attempting to kill process ${pid}...`);
      return killProcess(pid);
    })).then(() => {
      console.log('\n✅ Done! Try starting the server again: node server.js');
    });
  });
}
