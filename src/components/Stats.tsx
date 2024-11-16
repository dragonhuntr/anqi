import { Trophy, Target, Calendar } from 'lucide-react';
import { StudyStats } from '../types';

interface StatsProps {
  stats: StudyStats;
}

export function Stats({ stats }: StatsProps) {
  const accuracy = stats.cardsStudied > 0
    ? Math.round((stats.correctAnswers / stats.cardsStudied) * 100)
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow flex items-center">
        <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full mr-4">
          <Trophy className="w-6 h-6 text-blue-500 dark:text-blue-300" />
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">current streak</p>
          <p className="text-xl font-semibold dark:text-white">{stats.streak} cards</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow flex items-center">
        <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full mr-4">
          <Target className="w-6 h-6 text-green-500 dark:text-green-300" />
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">accuracy</p>
          <p className="text-xl font-semibold dark:text-white">{accuracy}%</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow flex items-center">
        <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full mr-4">
          <Calendar className="w-6 h-6 text-purple-500 dark:text-purple-300" />
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">cards studied</p>
          <p className="text-xl font-semibold dark:text-white">{stats.cardsStudied}</p>
        </div>
      </div>
    </div>
  );
}