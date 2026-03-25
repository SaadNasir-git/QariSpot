import Link from 'next/link'
import { Amiri } from 'next/font/google';
import SideMenu from './SideMenu';
const amiri700 = Amiri({ weight: '700' })

const Header = () => {
  return (
    <div className={`${amiri700.className} dark pl-1 w-full bg-transparent mb-2 flex justify-between`}>
      <Link href={'/'} className='w-44 flex justify-center items-center gap-2'>
        <img src={'/quran.svg'} alt="Quran" className='w-14 h-14' />
        <span className='font-extrabold text-2xl text-white'>
          QariSpot
        </span>
      </Link>
      <SideMenu />
    </div>
  )
}

export default Header
