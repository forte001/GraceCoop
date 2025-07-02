export function formatDateTime(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);

  const day = date.getDate();
  const daySuffix = getDaySuffix(day);

  const options = {
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };

  const formatted = date.toLocaleString('en-US', options);
  
  return `${date.toLocaleString('en-US', { month: 'long' })} ${day}${daySuffix}, ${date.getFullYear()}, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
}

function getDaySuffix(day) {
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}
