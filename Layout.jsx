import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Search,
  Send,
  Key,
  Share2,
  Archive,
  Settings,
  Menu,
  X,
  Zap,
  Bell
} from 'lucide-react';
import useStore from '../store/useStore';

const menuItems = [
  { path: '/', icon: Home, label: 'الرئيسية' },
  { path: '/search', icon: Search, label: 'البحث' },
  { path: '/publish', icon: Send, label: 'قائمة النشر' },
  { path: '/api-keys', icon: Key, label: 'مفاتيح API' },
  { path: '/social', icon: Share2, label: 'حسابات التواصل' },
  { path: '/archive', icon: Archive, label: 'الأرشيف' },
  { path: '/settings', icon: Settings, label: 'الإعدادات' }
];

function Layout({ children }) {
  const location = useLocation();
  const { sidebarOpen, toggleSidebar, notifications, removeNotification } = useStore();
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-700">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed right-0 top-0 h-full w-72 glass border-l border-white/10 z-40"
          >
            {/* Logo */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-blue to-neon-pink flex items-center justify-center shadow-neon-blue">
                  <Zap className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold gradient-text">RT News</h1>
                  <p className="text-xs text-gray-400">Intelligence System</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="p-4 space-y-2">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                
                return (
                  <Link key={item.path} to={item.path}>
                    <motion.div
                      whileHover={{ scale: 1.02, x: -5 }}
                      whileTap={{ scale: 0.98 }}
                      className={`flex items-center gap-3 p-4 rounded-xl transition-all duration-300 ${
                        isActive
                          ? 'bg-gradient-to-l from-neon-blue/20 to-transparent border-r-4 border-neon-blue neon-border-blue'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-neon-blue' : 'text-gray-400'}`} />
                      <span className={`font-medium ${isActive ? 'text-white' : 'text-gray-300'}`}>
                        {item.label}
                      </span>
                      {isActive && (
                        <motion.div
                          layoutId="activeIndicator"
                          className="mr-auto w-2 h-2 rounded-full bg-neon-blue shadow-neon-blue"
                        />
                      )}
                    </motion.div>
                  </Link>
                );
              })}
            </nav>

            {/* Stats */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
              <div className="grid grid-cols-2 gap-3">
                <div className="card-3d p-3 text-center">
                  <p className="text-2xl font-bold neon-text-blue">0</p>
                  <p className="text-xs text-gray-400">أخبار اليوم</p>
                </div>
                <div className="card-3d p-3 text-center">
                  <p className="text-2xl font-bold neon-text-green">0</p>
                  <p className="text-xs text-gray-400">تم النشر</p>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'mr-72' : ''}`}>
        {/* Header */}
        <header className="sticky top-0 z-30 glass border-b border-white/10">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-xl hover:bg-white/10 transition-colors"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <div className="flex items-center gap-4">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <Bell className="w-6 h-6" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-neon-red rounded-full text-xs flex items-center justify-center">
                      {notifications.length}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute left-0 top-full mt-2 w-80 card-3d p-4 max-h-96 overflow-y-auto"
                    >
                      <h3 className="font-bold mb-3">الإشعارات</h3>
                      {notifications.length === 0 ? (
                        <p className="text-gray-400 text-sm">لا توجد إشعارات</p>
                      ) : (
                        <div className="space-y-2">
                          {notifications.map((notif) => (
                            <div
                              key={notif.id}
                              className={`p-3 rounded-lg border ${
                                notif.type === 'success'
                                  ? 'border-neon-green/30 bg-neon-green/10'
                                  : notif.type === 'error'
                                  ? 'border-neon-red/30 bg-neon-red/10'
                                  : 'border-neon-blue/30 bg-neon-blue/10'
                              }`}
                            >
                              <p className="text-sm">{notif.message}</p>
                              <button
                                onClick={() => removeNotification(notif.id)}
                                className="text-xs text-gray-400 mt-1"
                              >
                                إغلاق
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}

export default Layout;
