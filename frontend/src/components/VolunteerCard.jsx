import { Phone, MapPin, Star, CheckSquare } from 'lucide-react';
import { StatusBadge } from './Badges';

const SKILL_LABEL = {
  'medical': 'Medical', 'first-aid': 'First Aid', 'counseling': 'Counseling',
  'elderly-care': 'Elderly Care', 'medicine-distribution': 'Medicine Dist.',
  'logistics': 'Logistics', 'food-distribution': 'Food Dist.', 'coordination': 'Coordination',
  'driving': 'Driving', 'plumbing': 'Plumbing', 'water-sanitation': 'Water Sanitation',
  'construction': 'Construction', 'heavy-lifting': 'Heavy Lifting', 'shelter-setup': 'Shelter Setup',
  'field-survey': 'Field Survey', 'documentation': 'Documentation',
  'translation-hindi': 'Hindi', 'translation-bengali': 'Bengali', 'translation-odia': 'Odia',
  'education': 'Education', 'child-welfare': 'Child Welfare', 'woman-child-welfare': 'Women & Child',
};

export default function VolunteerCard({ volunteer }) {
  return (
    <div className="card p-4 hover:border-pulse-teal/30 transition-colors duration-150">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-pulse-tealDark flex items-center justify-center text-pulse-teal font-bold text-sm">
            {volunteer.name.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-semibold text-pulse-text">{volunteer.name}</p>
            <p className="text-xs text-pulse-muted capitalize">{volunteer.availability}</p>
          </div>
        </div>
        <StatusBadge status={volunteer.status} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-white/5 rounded-lg px-3 py-2 flex items-center gap-2">
          <Star size={13} className="text-pulse-medium" />
          <div>
            <p className="text-xs font-semibold text-pulse-text">{volunteer.rating.toFixed(1)}</p>
            <p className="text-[10px] text-pulse-muted">Rating</p>
          </div>
        </div>
        <div className="bg-white/5 rounded-lg px-3 py-2 flex items-center gap-2">
          <CheckSquare size={13} className="text-pulse-teal" />
          <div>
            <p className="text-xs font-semibold text-pulse-text">{volunteer.tasksCompleted}</p>
            <p className="text-[10px] text-pulse-muted">Tasks done</p>
          </div>
        </div>
      </div>

      {/* Contact + location */}
      <div className="flex flex-col gap-1 mb-3 text-xs text-pulse-muted">
        <span className="flex items-center gap-1.5"><Phone size={11} />{volunteer.phone}</span>
        <span className="flex items-center gap-1.5">
          <MapPin size={11} />{volunteer.location?.area}, {volunteer.location?.ward}
        </span>
      </div>

      {/* Skills */}
      <div className="flex flex-wrap gap-1">
        {volunteer.skills.map((s) => (
          <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-pulse-tealDark/40 text-pulse-teal border border-pulse-teal/20">
            {SKILL_LABEL[s] || s}
          </span>
        ))}
      </div>
    </div>
  );
}
