import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Dashboard', icon: '\u2302' },
  { to: '/users', label: 'Users', icon: '\u263A' },
  { to: '/posts', label: 'Posts', icon: '\u270E' },
  { to: '/communities', label: 'Communities', icon: '\u2691' },
  { to: '/games', label: 'Games', icon: '\u265F' },
  { to: '/tags', label: 'Tags', icon: '\u2605' },
  { to: '/awards', label: 'Awards', icon: '\u2655' },
  { to: '/relationships', label: 'Relationships', icon: '\u2194' },
  { to: '/queries', label: 'Queries', icon: '\u2315' },
  { to: '/csv-upload', label: 'CSV Upload', icon: '\u21E7' },
  { to: '/graph', label: 'Graph View', icon: '\u25C8' },
  { to: '/gds', label: 'GDS Algorithms', icon: '\u2699' },
];

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 h-screen w-64 bg-[#1a1b23] border-r border-gray-700 flex flex-col overflow-y-auto z-50">
      <div className="px-6 py-5 border-b border-gray-700">
        <h1 className="text-xl font-bold text-indigo-400 tracking-tight">
          GGBoard
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">Gaming Community Hub</p>
      </div>

      <ul className="flex-1 py-3 space-y-0.5 px-3">
        {links.map(({ to, label, icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-400'
                    : 'text-gray-400 hover:text-gray-100 hover:bg-white/5'
                }`
              }
            >
              <span className="text-base w-5 text-center">{icon}</span>
              {label}
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="px-6 py-4 border-t border-gray-700 text-xs text-gray-600">
        Neo4j + React
      </div>
    </nav>
  );
}

export default Navbar;
