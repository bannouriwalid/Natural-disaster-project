'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiMap, FiBarChart2, FiSettings } from 'react-icons/fi'; 
import adminImg from '@/app/assets/admin.png';

export default function Sidebar() {
  const pathname = usePathname();

  const links = [
    { name: 'Real Time Map', href: '/map', icon: <FiMap /> },
    { name: 'Statistics', href: '/statistics', icon: <FiBarChart2 /> },
    { name: 'Settings', href: '/settings', icon: <FiSettings /> },
  ];

  return (
    <div className="w-64 bg-raisin-black border-r p-4">
      <h1 className="text-3xl text-center font-bold mb-6 french-gray-2 pt-3">
        QuakeDash
      </h1>
      <div className="flex flex-col items-center mb-6">
        <Avatar className="w-16 h-16 mx-auto mb-2">
          <AvatarImage src={adminImg.src} alt="Admin Avatar" />
          <AvatarFallback>Admin</AvatarFallback>
        </Avatar>
        <span className="text-center text-lg font-semibold text-white font-bold">Admin</span>
      </div>
      <ul className="space-y-4">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className={`flex items-center gap-3 p-2 rounded hover:bg-gray-200 rose-taupe font-bold ${
                pathname === link.href ? 'bg-gray-300 font-semibold' : ''
              }`}
            >
              {link.icon}
              {link.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
