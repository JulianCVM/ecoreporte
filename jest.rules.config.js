// Pruebas de las reglas de Firestore y Storage (issue #7). Necesitan los emuladores, así que no
// van en `npm test`: se corren con `npm run test:rules`, que los levanta con
// `firebase emulators:exec` y los apaga al terminar.
module.exports = {
  preset: 'jest-expo/node',
  roots: ['<rootDir>/firebase'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  // Todas las pruebas comparten los mismos emuladores y los vacían entre casos: una a la vez.
  maxWorkers: 1,
};
