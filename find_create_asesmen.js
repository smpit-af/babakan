const fs = require('fs');
['js/master_data.js', 'js/asesmen.js', 'app.js'].forEach(file => {
    if (!fs.existsSync(file)) return;
    const c = fs.readFileSync(file, 'utf8');
    const lines = c.split('\n');
    lines.forEach((l, i) => {
        if (l.includes("from('asesmen').insert") || l.includes('from("asesmen").insert')) {
            console.log(`${file}:${i+1}: ${l.trim()}`);
            console.log(lines.slice(Math.max(0, i - 15), i + 10).join('\n'));
            console.log('====================================');
        }
    });
});

