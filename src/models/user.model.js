import mongoose from "mongoose";  
import validator from "validator";
import bcrypt from "bcryptjs"; 

export const userRef = { type: mongoose.Schema.Types.ObjectId, ref: "User" };

const userSchema = mongoose.Schema(
    {
        username: { type: String, required: true, trim: true },
        email: {
            type: String, required: true, trim: true, lowercase: true,
            validate: {
                validator: value => validator.isEmail(value),
                message: props=>{
                    return `${props.value} is not a valid email address`
                }
            }
        },
        password: {
            type: String, required: true, minLength: 8,
            validate(value) {
                if (!value.match(/\d/) || !value.match(/[a-zA-Z]/)) {
                    throw new Error("Password must contain at least one letter and one number");
                }
            },
        },
        sentRequests: [ userRef ],
        receivedRequests: [ userRef ],
        friends: [ userRef ],
        blocked: [ userRef ] 
    },
    { timestamps: true }
);

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

userSchema.statics.isEmailTaken = async function (email) {
    const user = await this.findOne({ email });
    return user ? true : false;
};

userSchema.methods.isPasswordMatch = async function (password) {
    return bcrypt.compare(password, this.password);
};

const User = mongoose.model("User", userSchema, "users");
export default User; 
 