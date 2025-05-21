import config from "../config/config.js";
import { transporter } from "../config/mailer.js";
const appURL = config.appURL;

const getMessage = (username) => (
        `<h2>Welcome to ChatApp, ${username}! 🎉</h2>
        <p>We're thrilled to have you on board. ChatApp is your space to connect, collaborate, and stay in touch with the people who matter most — all in real time.</p>
        <p>Start chatting instantly with your friends, share files, join group conversations, and enjoy a seamless messaging experience across devices.</p>
        <p><strong>Get started now:</strong></p>
        <p>
            <a href="${appURL}" style="background-color:#4f46e5; color:white; padding:10px 20px; text-decoration:none; border-radius:5px; display:inline-block;">
                Open ChatApp
            </a>
        </p>
        <p>If you ever have any questions or feedback, we're just a message away.</p>
        <p>Cheers,<br/>The ChatApp Team</p>
        <hr/>
        <p style="font-size: 0.9em; color: #888;">
            You’re receiving this email because you signed up for ChatApp.<br/>
            Visit us anytime: <a href="${appURL}">${appURL}</a>
        </p>`
    );

const welcomeEmail = async (user) => {   
    try {
        await transporter.sendMail({
            from: '"ChatApp Support" <inkersal143@gmail.com>',
            to: user.email,
            subject: "Welcome to ChatApp 🎉",
            html: getMessage(user.username)
        });
        return true;
    } catch (error) {
        return error.message;
    }    
};

export default welcomeEmail;