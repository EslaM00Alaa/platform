const nodemailer = require("nodemailer");

// Use module.exports instead of module.export
module.exports = (mail, msg) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: "onlineem936@gmail.com",
            pass: "qgqfaphmbvijlrur",
          },
    });

    const mailOptions = {
        from: "onlineem936@gmail.com",
        to: mail,
        subject: "EM_Online",
        html: `<center><h1 style="padding: 8px; border-radius: 2px 23px; border: 2px solid #084e87;background-color: #084e87">EM Online</h1>  <br><h4>${msg}</h4></center>`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error("Failed to send email:", error);
            // Don't return response here
        } else {
            console.log("Email sent successfully");
            // Don't return response here
        }
    });
};
