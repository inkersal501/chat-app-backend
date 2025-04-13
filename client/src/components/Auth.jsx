import React, { useState } from 'react';
import { Fade } from 'react-awesome-reveal';
import auth from "../js/auth";
import { ClipLoader } from 'react-spinners';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const updateFormData = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  }

  const formSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
 
    try {
      if (isLogin) {
        await auth.signIn(formData);
      } else {
        await auth.signUp(formData);
        setIsLogin(true);
      }

      setFormData({ username: "", email: "", password: "" });
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  }

  return (
    <div className="w-full">
      <Fade direction="up" triggerOnce>
        <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md mx-auto relative">

          {loading && (
            <div className="absolute inset-0 bg-opacity-50 backdrop-blur-[1.5px] flex items-center justify-center z-50 rounded-2xl">
              <ClipLoader color="#7C3AED" size={50} />
            </div>
          )}

          <div className={`${loading ? "opacity-80 pointer-events-none" : ""}`}>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              {isLogin ? 'Sign In' : 'Sign Up'}
            </h2>
            <p className="text-sm text-gray-500">
              {isLogin ? 'Welcome back to ChatApp' : 'Create a new ChatApp account'}
            </p>
          </div>

          <form className="space-y-4 mt-4" onSubmit={formSubmit}>
            {!isLogin && (
              <>
                <label htmlFor="username" className="text-gray-400">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  placeholder="Enter Your Username"
                  onInput={updateFormData}
                  value={formData.username}
                  className="w-full px-4 py-2 text-black font-medium border border-zinc-300 rounded-lg focus-visible:outline-none focus-visible:border-2 focus-visible:border-purple-400"
                />
              </>
            )}

            <label htmlFor="email" className="text-gray-400">
              Email
            </label>
            <input
              type="email"
              id="email"
              placeholder="Enter Your Email"
              onInput={updateFormData}
              value={formData.email}
              className="w-full px-4 py-2 text-black font-medium border border-zinc-300 rounded-lg focus-visible:outline-none focus-visible:border-2 focus-visible:border-purple-400"
            />

            <label htmlFor="password" className="text-gray-400">
              Password
            </label>
            <input
              type="password"
              id="password"
              placeholder="Enter Your Password"
              onInput={updateFormData}
              value={formData.password}
              className="w-full px-4 py-2 text-black font-medium border border-zinc-300 rounded-lg focus-visible:outline-none focus-visible:border-2 focus-visible:border-purple-400"
            />

            <button
              type="submit"
              className="w-full bg-purple-600 text-white font-medium py-2 rounded-lg hover:bg-purple-700 transition duration-300 cursor-pointer"
            >
              {isLogin ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          <div className="text-center mt-4 text-sm text-gray-600">
            {isLogin ? (
              <>
                Don’t have an account?{' '}
                <button
                  onClick={() => setIsLogin(false)}
                  className="text-purple-600 hover:underline font-medium cursor-pointer underline"
                >
                  Sign Up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => setIsLogin(true)}
                  className="text-purple-600 hover:underline font-medium cursor-pointer underline"
                >
                  Sign In
                </button>
              </>
            )}
          </div>
        </div>
      </Fade>
    </div>
  );
};

export default Auth;
