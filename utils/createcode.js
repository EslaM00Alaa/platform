function generateRandomString(){
    const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
    let randomString = '';
    for (let i = 0; i < 8; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      randomString += characters.charAt(randomIndex);
    }
    return randomString;
  };

  module.exports = generateRandomString;