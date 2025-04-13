import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'inkersal143@gmail.com',          
      pass: 'sjrilqlelsxmmphd'              
    }
});