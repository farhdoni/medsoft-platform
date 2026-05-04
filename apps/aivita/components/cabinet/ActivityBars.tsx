'use client';
import * as React from 'react';

interface ActivityBarsProps {
  data?: number[];
  weekdayLabels?: string[];
  highlightLast?: boolean;
}

const RU_WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export const ActivityBars: React.FC<ActivityBarsProps> = ({
  data = [40, 55, 30, 65, 45, 50, 85],
  weekdayLabels = RU_WEEKDAYS,
  highlightLast = true,
}) => {
  const max = Math.max(...data, 1);
  return (
    <div className="flex gap-2 items-end h-[80px]">
      {data.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full">
          <div className="flex-1 w-full flex items-end">
            <div
              className="w-full rounded-lg transition-all duration-300"
              style={{
                height: `${(v / max) * 100}%`,
                background: highlightLast && i === data.length - 1
                  ? 'linear-gradient(135deg, #cc8a96 0%, #9889c4 100%)'
                  : '#e8e4dc',
              }}
            />
          </div>
          <div className="text-[10px] font-medium" style={{ color: '#9a96a8' }}>
            {weekdayLabels[i]}
          </div>
        </div>
      ))}
    </div>
  );
};
