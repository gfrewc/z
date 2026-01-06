import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Search,
  Send,
  Key,
  TrendingUp,
  Clock,
  Zap,
  BarChart3,
  Activity
} from 'lucide-react';
import useStore from '../store/useStore';

function Dashboard() {
  const { stats, publishQueue, newsArchive, apiKeys } = useStore();

  const quickActions = [
    {
      icon: Search,
      label: 'بحث جديد',
      description: 'ابحث عن أخبار جديدة',
      path: '/search',
      color: 'blue'
    },
    {
      icon: Send,
      label: 'قائمة النشر',
      description: `${publishQueue.filter(p => p.status === 'pending').length} منشور في الانتظار`,
      path: '/publish',
      color: 'green'
    },
    {
      icon: Key,
      label: 'مفاتيح API',
      description: 'إدارة المفاتيح',
      path: '/api-keys',
      color: 'pink'
    }
  ];

  const statsCards = [
    {
      icon: BarChart3,
      label: 'إجمالي الأخبار',
      value: newsArchive.length,
      color: 'blue'
    },
    {
      icon: Send,
      label: 'تم النشر',
      value: stats.totalPublished,
      color: 'green'
    },
    {
      icon: Activity,
      label: 'طلبات API اليوم',
      value: stats.apiCallsToday,
      color: 'yellow'
    },
    {
      icon: Clock,
      label: 'في الانتظار',
      value: publishQueue.filter(p => p.status === 'pending').length,
      color: 'pink'
    }
  ];

  const totalKeys = Object.values(apiKeys).reduce((sum, keys) => sum + keys.length, 0);

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-3d p-8 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-l from-neon-blue/10 via-transparent to-neon-pink/10" />
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-blue to-neon-pink flex items-center justify-center shadow-neon-blue animate-pulse-neon">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold gradient-text">مرحباً بك في RT News Intelligence</h1>
              <p className="text-gray-400 mt-1">نظام ذكي لجمع وإعادة صياغة ونشر الأخبار</p>
            </div>
          </div>
          
          {totalKeys === 0 && (
            <div className="mt-4 p-4 rounded-xl bg-neon-yellow/10 border border-neon-yellow/30">
              <p className="text-neon-yellow flex items-center gap-2">
                <Key className="w-5 h-5" />
                لم تقم بإضافة أي مفاتيح API بعد. 
                <Link to="/api-keys" className="underline hover:text-white">أضف مفتاحاً الآن</Link>
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          const colorClasses = {
            blue: 'from-neon-blue/20 to-transparent border-neon-blue/30 text-neon-blue',
            green: 'from-neon-green/20 to-transparent border-neon-green/30 text-neon-green',
            yellow: 'from-neon-yellow/20 to-transparent border-neon-yellow/30 text-neon-yellow',
            pink: 'from-neon-pink/20 to-transparent border-neon-pink/30 text-neon-pink'
          };
          
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`card-3d p-6 bg-gradient-to-br ${colorClasses[stat.color]} border`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">{stat.label}</p>
                  <p className="text-4xl font-bold mt-2">{stat.value}</p>
                </div>
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${colorClasses[stat.color]} flex items-center justify-center`}>
                  <Icon className="w-7 h-7" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-neon-blue" />
          إجراءات سريعة
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            const colorClasses = {
              blue: 'hover:border-neon-blue hover:shadow-neon-blue',
              green: 'hover:border-neon-green hover:shadow-neon-green',
              pink: 'hover:border-neon-pink hover:shadow-neon-pink'
            };
            
            return (
              <Link key={action.path} to={action.path}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                  whileTap={{ scale: 0.98 }}
                  className={`card-3d p-6 border-2 border-transparent transition-all duration-300 cursor-pointer ${colorClasses[action.color]}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-neon-${action.color}/20 to-transparent flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 text-neon-${action.color}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{action.label}</h3>
                      <p className="text-gray-400 text-sm">{action.description}</p>
                    </div>
                  </div>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent News */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card-3d p-6"
        >
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-neon-blue" />
            آخر الأخبار المعالجة
          </h3>
          {newsArchive.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>لا توجد أخبار بعد</p>
              <Link to="/search" className="text-neon-blue hover:underline text-sm">
                ابدأ البحث الآن
              </Link>
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {newsArchive.slice(-5).reverse().map((news, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <p className="font-medium text-sm line-clamp-1">{news.title}</p>
                  <p className="text-xs text-gray-400 mt-1">{news.source}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Pending Posts */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card-3d p-6"
        >
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-neon-green" />
            منشورات في الانتظار
          </h3>
          {publishQueue.filter(p => p.status === 'pending').length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Send className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>لا توجد منشورات في الانتظار</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {publishQueue
                .filter(p => p.status === 'pending')
                .slice(0, 5)
                .map((post) => (
                  <div
                    key={post.id}
                    className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <p className="font-medium text-sm line-clamp-1">{post.title}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(post.createdAt).toLocaleString('ar-EG')}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default Dashboard;
