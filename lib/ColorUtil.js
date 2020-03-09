'use strict';

exports.booleanColors = (value) => {
  const colors = value ? ['b', 'green'] : ['b', 'red'];
  const open = colors.map(color => `<${color}>`).join('');
  const close = colors.reverse().map(color => `</${color}>`).join('');

  return { open, close };
};
