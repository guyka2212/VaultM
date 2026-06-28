export function getPasswordStrength(password) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  return Math.min(score, 4);
}

export function getStrengthLabel(score) {
  const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  return labels[score] || 'Unknown';
}

export function getStrengthColor(score) {
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'];
  return colors[score] || '#6b7280';
}

export function generatePassword(length = 24) {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const all = uppercase + lowercase + numbers + symbols;

  const getRandom = (str) => str[Math.floor(Math.random() * str.length)];

  let password = '';
  password += getRandom(uppercase);
  password += getRandom(lowercase);
  password += getRandom(numbers);
  password += getRandom(symbols);

  for (let i = password.length; i < length; i++) {
    password += getRandom(all);
  }

  return password.split('').sort(() => Math.random() - 0.5).join('');
}
