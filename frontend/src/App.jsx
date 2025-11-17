import { useEffect } from 'react'
import ChatPage from './components/ChatPage'
import EditProfile from './components/EditProfile'
import Home from './components/Home'
import Login from './components/Login'
import MainLayout from './components/MainLayout'
import Profile from './components/Profile'
import Signup from './components/Signup'
import DiagnosticsPage from './components/DiagnosticsPage'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { io } from "socket.io-client";
import Notifications from './components/Notifications'
import { useDispatch, useSelector } from 'react-redux'
import { setSocket } from './redux/socketSlice'
import { setSocketInstance, clearSocketInstance } from './lib/socketManager'
import { setOnlineUsers } from './redux/chatSlice'
import { setLikeNotification } from './redux/rtnSlice'
import ProtectedRoutes from './components/ProtectedRoutes'


const browserRouter = createBrowserRouter([
  {
    path: "/",
    element: <ProtectedRoutes><MainLayout /></ProtectedRoutes>,
    children: [
      {
        path: '/',
        element: <ProtectedRoutes><Home /></ProtectedRoutes>
      },
      {
        path: '/explore',
        element: <ProtectedRoutes><Home /></ProtectedRoutes>
      },
      {
        path: '/profile/:id',
        element: <ProtectedRoutes> <Profile /></ProtectedRoutes>
      },
      {
        path: '/account/edit',
        element: <ProtectedRoutes><EditProfile /></ProtectedRoutes>
      },
      {
        path: '/chat',
        element: <ProtectedRoutes><ChatPage /></ProtectedRoutes>
      },
      {
        path: '/notifications',
        element: <ProtectedRoutes><Notifications /></ProtectedRoutes>
      },
      {
        path: '/create',
        element: <ProtectedRoutes><Home /></ProtectedRoutes>
      },
    ]
  },
  {
    path: '/login',
    element: <Login />
  },
  {
    path: '/signup',
    element: <Signup />
  },
  {
    path: '/diagnostics',
    element: <DiagnosticsPage />
  },
])

function App() {
  const { user } = useSelector(store => store.auth);
  const { connected, id } = useSelector(store => store.socketio);
  const dispatch = useDispatch();

  useEffect(() => {
    if (user) {
      const socketio = io('http://localhost:8000', {
        query: { userId: user?._id },
        transports: ['websocket'],
      });

      // keep the raw socket instance outside Redux to avoid serialization
      setSocketInstance(socketio);
      dispatch(setSocket({ connected: true, id: socketio.id }));

      // listen all the events and dispatch serializable payloads
      socketio.on('getOnlineUsers', (onlineUsers) => {
        dispatch(setOnlineUsers(onlineUsers));
      });

      socketio.on('notification', (notification) => {
        dispatch(setLikeNotification(notification));
      });

      return () => {
        try { socketio.close(); } catch (e) {}
        clearSocketInstance();
        dispatch(setSocket(null));
      };
    } else if (connected) {
      // if store says we had a socket but user is gone, clear instance
      clearSocketInstance();
      dispatch(setSocket(null));
    }
  }, [user, dispatch]);

  return (
    <>
      <RouterProvider router={browserRouter} />
    </>
  )
}

export default App
