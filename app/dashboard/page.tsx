import Link from 'next/link'

const links = [
  {
    url: '/dashboard/add-qari',
    name: 'Add New Qari'
  },
  {
    url: '/dashboard/add-surah',
    name: 'Add Surah'
  },
  {
    url: '/dashboard/assign-role',
    name: 'Assign Role'
  }
]

const DashBoard = () => {
  return (
    <div className="p-6 mx-auto min-h-screen">
      <h1 className="text-2xl font-bold mb-6">
        Dashboard
      </h1>
      <div className="flex flex-col gap-3">
        {links.map((link, index) => (
          <Link
            key={index}
            href={link.url}
            className="p-4 rounded-lg transition-colors bg-[#1A1A1A] flex justify-center items-center hover:bg-[#101010] text-white"
          >
            <span>
              {link.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default DashBoard
