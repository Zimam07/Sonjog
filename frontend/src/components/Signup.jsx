import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setAuthUser } from '../redux/authSlice';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = 'http://localhost:8000/api/v1/user';

export default function Signup() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState({
    username: '',
    email: '',
    password: '',
  });

  const changeEventHandler = (e) => {
    setInput({ ...input, [e.target.name]: e.target.value });
  };

  const signupHandler = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      // Check if all fields are filled
      if (!input.username || !input.email || !input.password) {
        toast.error('Please fill all fields');
        return;
      }

      // Register user. Include credentials so cookies (if set at register) are accepted in cross-port dev.
      const registerRes = await axios.post(
        `${API_URL}/register`,
        input,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        }
      );

      if (registerRes.data.success) {
        toast.success(registerRes.data.message);
        
        // Auto-login after signup
        const loginRes = await axios.post(
          `${API_URL}/login`,
          { email: input.email, password: input.password },
          {
            headers: {
              'Content-Type': 'application/json',
            },
            withCredentials: true,
          }
        );

        if (loginRes.data.success) {
          dispatch(setAuthUser(loginRes.data.user));
          navigate('/');
          toast.success(loginRes.data.message);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Signup failed');
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-gray-900">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-extrabold">Create your account</h1>
          <p className="text-sm text-gray-500">Join Sonjog — it's quick and easy.</p>
        </div>

        <form onSubmit={signupHandler} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              name="username"
              placeholder="Choose a username"
              value={input.username}
              onChange={changeEventHandler}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              value={input.email}
              onChange={changeEventHandler}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              name="password"
              placeholder="Create a password"
              value={input.password}
              onChange={changeEventHandler}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg font-semibold shadow hover:opacity-95 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-600 hover:underline">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
