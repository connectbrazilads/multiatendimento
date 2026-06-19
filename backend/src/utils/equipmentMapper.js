function mapEquipmentType(typeCode, modelName = '') {
  if (!typeCode) return 'Outros';
  const code = String(typeCode).trim();
  
  // If it's already a descriptive text (not just numbers), return it
  if (isNaN(Number(code))) {
    return code;
  }
  
  // Static mapping of known product codes from Firebird
  const mapping = {
    '154': 'MULTIFUNCIONAL COLOR',
    '150': 'MULTIFUNCIONAL MONOCROMÁTICO',
    '225': 'MULTIFUNCIONAL MONOCROMÁTICO',
    '157': 'MULTIFUNCIONAL COLOR',
    '820': 'MULTIFUNCIONAL COLOR',
    '137': 'MULTIFUNCIONAL COLOR',
    '113': 'MULTIFUNCIONAL MONOCROMÁTICO',
    '101': 'MULTIFUNCIONAL MONOCROMÁTICO',
    '102': 'MULTIFUNCIONAL MONOCROMÁTICO',
    '118': 'MULTIFUNCIONAL MONOCROMÁTICO',
    '133': 'MULTIFUNCIONAL COLOR',
    '155': 'MULTIFUNCIONAL COLOR',
    '141': 'MULTIFUNCIONAL COLOR',
    '162': 'IMPRESSORA TÉRMICA',
    '100': 'MULTIFUNCIONAL MONOCROMÁTICO', // Ricoh SP 3510SF
    '6010': 'MULTIFUNCIONAL COLOR', // Canon G6010
  };
  
  if (mapping[code]) {
    return mapping[code];
  }
  
  // Dynamic fallback based on model name keywords
  const modelUpper = String(modelName).toUpperCase();
  if (modelUpper.includes('COLOR') || modelUpper.includes('C8030') || modelUpper.includes('7835') || modelUpper.includes('7855') || modelUpper.includes('T830') || modelUpper.includes('T910')) {
    return 'MULTIFUNCIONAL COLOR';
  }
  if (modelUpper.includes('MONO') || modelUpper.includes('BM5100') || modelUpper.includes('MX711') || modelUpper.includes('310SF') || modelUpper.includes('3510') || modelUpper.includes('377') || modelUpper.includes('3710')) {
    return 'MULTIFUNCIONAL MONOCROMÁTICO';
  }
  
  // Default fallbacks for other codes
  return 'MULTIFUNCIONAL MONOCROMÁTICO';
}

module.exports = {
  mapEquipmentType
};
