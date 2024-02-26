const client = require("./db");

async function isReady() {
  try {
    const tableCheckQuery = `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = $1
      );
    `;

    const createTableQueries = [
      `
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        fName VARCHAR(255) NOT NULL,
        lName VARCHAR(255) NOT NULL,
        mail VARCHAR(255) NOT NULL,
        pass VARCHAR(255) NOT NULL,
        phone VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL
      );

      INSERT INTO admins (fName, lName, mail, pass, phone, role) VALUES ('muhamed', 'abdelQader', 'emadmen15@gmail.com', 'mu1234', '01227145090', 'admin');
      `,
      `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        fName VARCHAR(255) NOT NULL,
        lName VARCHAR(255) NOT NULL,
        verify_code VARCHAR(255),
        mail VARCHAR(255) NOT NULL UNIQUE,
        pass VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(255) NOT NULL,
        grad INT NOT NULL
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS covers (
        image_id VARCHAR(255) PRIMARY KEY,
        image VARCHAR(255) NOT NULL
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS teachers (
        id SERIAL PRIMARY KEY,
        cover VARCHAR(255) REFERENCES covers (image_id) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description VARCHAR(255) NOT NULL,
        mail VARCHAR(255) NOT NULL,
        pass VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        verify_code VARCHAR(255),
        whats VARCHAR(255),
        facebook VARCHAR(255),
        tele VARCHAR(255)
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS grades (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL
      );

      INSERT INTO grades (name) VALUES ('الاول الثانوي'), ('الثاني الثانوي'), ('الثالث الثانوي');
      `,
      `
      CREATE TABLE IF NOT EXISTS classes (
        id SERIAL PRIMARY KEY,
        grad_id INT REFERENCES grades (id) NOT NULL,
        teacher_id INT REFERENCES teachers (id) NOT NULL
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY,
        teacher_id INT REFERENCES teachers (id) NOT NULL,
        group_name VARCHAR(255) NOT NULL,
        grad_id INT REFERENCES grades (id) NOT NULL
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS joingroup (
        group_id INT REFERENCES groups (id),
        std_id INT REFERENCES users (id)
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS exams (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        number INT NOT NULL
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS lecture_group (
        id SERIAL PRIMARY KEY,
        teacher_id INT REFERENCES teachers (id) NOT NULL,
        cover VARCHAR(255) REFERENCES covers (image_id) NOT NULL,
        description VARCHAR(255) NOT NULL,
        grad_id INT REFERENCES grades (id) NOT NULL,
        exam_id INT REFERENCES exams (id)
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS lecture_online (
        id SERIAL PRIMARY KEY,
        teacher_id INT REFERENCES teachers (id) NOT NULL,
        cover VARCHAR(255) REFERENCES covers (image_id) NOT NULL,
        description VARCHAR(255) NOT NULL,
        grad_id INT REFERENCES grades (id) NOT NULL,
        price INT NOT NULL,
        exam_id INT REFERENCES exams (id)
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS joininglecture (
        id SERIAL PRIMARY KEY,
        u_id INT REFERENCES users (id) NOT NULL,
        lgroup_id INT REFERENCES lecture_group (id) ON DELETE CASCADE,
        lonline_id INT REFERENCES lecture_online (id) ON DELETE CASCADE
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS groupslecture (
        g_id SERIAL PRIMARY KEY,
        l_id INT REFERENCES lecture_group (id) NOT NULL
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS platformwallet (
        value INT DEFAULT 0 
      );
      
      INSERT INTO platformwallet DEFAULT VALUES;
      `,
      `
      CREATE TABLE IF NOT EXISTS userwallet (
        u_id INT REFERENCES users (id) NOT NULL,
        value INT DEFAULT 0 
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS teacherwallet (
        teacher_id INT REFERENCES teachers (id) NOT NULL,
        value INT DEFAULT 0 
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS codes (
        code VARCHAR(300) PRIMARY KEY,
        value INT NOT NULL 
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS questiones (
        id SERIAL PRIMARY KEY,
        exam_id INT REFERENCES exams (id) NOT NULL,
        question VARCHAR(1000) NOT NULL,
        answer1 VARCHAR(1000) NOT NULL,
        answer2 VARCHAR(1000) NOT NULL,
        answer3 VARCHAR(1000) NOT NULL,
        answer4 VARCHAR(1000) NOT NULL,
        correctAnswer VARCHAR(1000) NOT NULL,
        degree INT NOT NULL,
        cover VARCHAR(255) REFERENCES covers (image_id) ON DELETE CASCADE
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS examssresult (
        u_id INT REFERENCES users (id) NOT NULL,
        exam_id INT REFERENCES exams (id) NOT NULL,
        result INT NOT NULL
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS examforuser  (
        u_id INT REFERENCES users (id) NOT NULL,
        exam_id INT REFERENCES exams (id) NOT NULL,
        q_id INT REFERENCES questiones (id) NOT NULL
      );
      `
    ];

    const tablesToCheck = [
      "admins",
      "users",
      "covers",
      "teachers",
      "grades",
      "classes",
      "groups",
      "joingroup",
      "exams",
      "lecture_group",
      "lecture_online",
      "joininglecture",
      "groupslecture",
      "platformwallet",
      "userwallet",
      "teacherwallet",
      "codes",
      "questiones",
      "examssresult",
      "examforuser"
    ];

    let c = 0;

    for (let i = 0; i < tablesToCheck.length; i++) {
      const res = await client.query(tableCheckQuery, [tablesToCheck[i]]);
      const existingTable = res.rows[0].exists;

      if (!existingTable) {
        await client.query(createTableQueries[i]);
        c++;
      }
    }

    console.log(`${c} tables created successfully!`);
  } catch (error) {
    console.error("Error occurred:", error);
  }
}

module.exports = isReady;
