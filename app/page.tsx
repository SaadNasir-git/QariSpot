import { getQaris } from "@/lib/data";
import HomePage from "./HomePage";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const fetchQaris = async () => {
  try {
    return await getQaris();
  } catch (error) {
    return []
  }
}

const Home = async() => {
  let Qaris = await fetchQaris()

  return (
    <HomePage Qaris={Qaris} />
  )
}

export default Home
