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
        pass VARCHAR(255) NOT NULL ,
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
        cover VARCHAR(255) REFERENCES covers (image_id)  ON DELETE CASCADE NOT NULL ,
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
        grad_id INT REFERENCES grades (id)  ON DELETE CASCADE NOT NULL,
        teacher_id INT REFERENCES teachers (id)  ON DELETE CASCADE NOT NULL
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY,
        teacher_id INT REFERENCES teachers (id)  ON DELETE CASCADE NOT NULL,
        group_name VARCHAR(255) NOT NULL,
        grad_id INT REFERENCES grades (id)  ON DELETE CASCADE NOT NULL
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS joingroup (
        group_id INT REFERENCES groups (id)  ON DELETE CASCADE ,
        std_id INT REFERENCES users (id)  ON DELETE CASCADE
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
        cover VARCHAR(255) REFERENCES covers (image_id)  ON DELETE CASCADE NOT NULL,
        description VARCHAR(255) NOT NULL,
        grad_id INT REFERENCES grades (id)  ON DELETE CASCADE NOT NULL,
        exam_id INT REFERENCES exams (id)  ON DELETE CASCADE
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS lecture_online (
        id SERIAL PRIMARY KEY,
        teacher_id INT REFERENCES teachers (id)  ON DELETE CASCADE NOT NULL,
        cover VARCHAR(255) REFERENCES covers (image_id)  ON DELETE CASCADE NOT NULL,
        description VARCHAR(255) NOT NULL,
        grad_id INT REFERENCES grades (id)  ON DELETE CASCADE NOT NULL,
        price INT NOT NULL,
        exam_id INT REFERENCES exams (id)  ON DELETE CASCADE
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS joininglecture (
        id SERIAL PRIMARY KEY,
        u_id INT REFERENCES users (id)  ON DELETE CASCADE NOT NULL,
        lgroup_id INT REFERENCES lecture_group (id) ON DELETE CASCADE,
        lonline_id INT REFERENCES lecture_online (id) ON DELETE CASCADE
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS groupslecture (
        g_id INT REFERENCES groups (id)  ,
        l_id INT REFERENCES lecture_group (id)  ON DELETE CASCADE NOT NULL
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
        u_id INT REFERENCES users (id)  ON DELETE CASCADE NOT NULL,
        value INT DEFAULT 0 
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS teacherwallet (
        teacher_id INT REFERENCES teachers (id)  ON DELETE CASCADE NOT NULL,
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
        exam_id INT REFERENCES exams (id)  ON DELETE CASCADE NOT NULL,
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
      CREATE TABLE IF NOT EXISTS exaresult (
        id SERIAL PRIMARY KEY,
        u_id INT REFERENCES users (id)  ON DELETE CASCADE NOT NULL,
        exam_id INT REFERENCES exams (id)  ON DELETE CASCADE NOT NULL,
        result INT NOT NULL
      );
      `,
      `
      CREATE TABLE IF NOT EXISTS lecturevideos (
        id SERIAL PRIMARY KEY,
        lo_id INT REFERENCES lecture_online (id)  ON DELETE CASCADE,
        lg_id INT REFERENCES lecture_group (id)  ON DELETE CASCADE,
        video VARCHAR(1000) NOT NULL,
        v_name VARCHAR(255) NOT NULL
    );
       `,
      `
      CREATE TABLE IF NOT EXISTS usersip (
        ip VARCHAR(255) PRIMARY KEY,
        u_id INT REFERENCES users (id)  ON DELETE CASCADE
       );
      `,
      `
      CREATE TABLE IF NOT EXISTS user_teacher (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id),
        teacher_id INT REFERENCES teachers(id)
    );
      `,
      `
            
      CREATE TABLE IF NOT EXISTS lecturepdf (
        id SERIAL PRIMARY KEY,
        lo_id INT REFERENCES lecture_online(id),
        lg_id INT REFERENCES lecture_group(id),
        pdf_path VARCHAR(1000) NOT NULL,
        pdf_name VARCHAR(255) NOT NULL
      );
      `,

      `CREATE TABLE IF NOT EXISTS months (
        id SERIAL PRIMARY KEY,
        teacher_id INT NOT NULL REFERENCES teachers (id),
        cover VARCHAR(255) NOT NULL REFERENCES covers (image_id) ON DELETE CASCADE,
        description VARCHAR(255) NOT NULL,
        grad_id INT NOT NULL REFERENCES grades (id) ON DELETE CASCADE,
        days INT DEFAULT 0,
        noflecture INT DEFAULT 0,
        price INT  DEFAULT -1
    );
    `,
      `
    CREATE TABLE IF NOT EXISTS lectureofmonths (
      id SERIAL PRIMARY KEY,
      m_id  INT REFERENCES months(id),
      lg_id INT REFERENCES lecture_group(id)
    );
    `,
      `
    CREATE TABLE IF NOT EXISTS lectureinmonths (
      id SERIAL PRIMARY KEY,
      lg_id INT REFERENCES lecture_group(id)
    );
    `,
      `
      CREATE TABLE IF NOT EXISTS joiningmonth (
        id SERIAL PRIMARY KEY,
        u_id INT REFERENCES users (id) ON DELETE CASCADE NOT NULL,
        m_id INT REFERENCES months (id) ON DELETE CASCADE,
        joindate DATE DEFAULT CURRENT_DATE
    );    
      `,
      `
        CREATE TABLE IF NOT EXISTS groupsmonths (
          id SERIAL PRIMARY KEY,
          g_id INT REFERENCES groups (id) ON DELETE CASCADE  ,
          m_id INT REFERENCES months (id) ON DELETE CASCADE
        );
        `,
        `
        CREATE TABLE IF NOT EXISTS teachercode (
        id SERIAL PRIMARY KEY,
        code VARCHAR(300),
        teacher_id INT REFERENCES teachers(id),
        used BOOLEAN DEFAULT false
       );
        `,


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
      "exaresult",
      "lecturevideos",
      "usersip",
      "user_teacher",
      "lecturepdf",
      "months",
      "lectureofmonths",
      "lectureinmonths",
      "joiningmonth",
      "groupsmonths",
      "teachercode"
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
