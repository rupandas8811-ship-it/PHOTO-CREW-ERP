const parseTime = (t) => {
      if (!t) return 0;
      let hours = 0;
      let minutes = 0;
      const match = t.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (match) {
        hours = parseInt(match[1], 10) || 0;
        minutes = parseInt(match[2], 10) || 0;
        const ampm = match[3]?.toUpperCase();
        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
      } else {
        const parts = t.split(':').map(Number);
        hours = parts[0] || 0;
        minutes = parts[1] || 0;
      }
      return hours * 60 + minutes;
};
console.log(parseTime("6:00"));
console.log(parseTime("06:00"));
console.log(parseTime("14:00"));
console.log(parseTime("05:00"));
console.log(parseTime("2:00 PM"));
