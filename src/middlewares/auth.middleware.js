import passport from "passport";

const verifyCallback = (req, res, resolve, reject) => (err, user, info) => {
    if(err || !user){
        // return res.status(401).send({ 
        //     msg: "Unauthorized. Please login to continue."
        // });
        return res.redirect("/");
    }else{ 
        req.user = user;
        resolve();
    }
}; 

const auth = async (req, res, next) => {
    return new Promise((resolve, reject) => {
        passport.authenticate(
        "jwt",
        { session: false },
        verifyCallback(req, res, resolve, reject)
        )(req, res, next);
    })
    .then(() => next())
    .catch((err) => next(err));
}; 

export default auth;