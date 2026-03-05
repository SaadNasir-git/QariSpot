import { CldImage } from "next-cloudinary"

const Card = ({ imageUrl, QariName }: { imageUrl: string, QariName: string }) => {
  return (
    <div className="w-full max-w-[200px] sm:w-50 h-auto sm:h-56 p-2 sm:p-4 flex flex-col rounded-lg hover:bg-[#1d1d1d]">
      <div className="w-full aspect-square sm:w-full sm:h-full relative">
        <CldImage
          src={imageUrl}
          fill
          sizes="(max-width: 640px) 50vw, 200px"
          className="object-cover rounded-md sm:rounded-none"
          style={{ objectPosition: 'center 20%' }}
          alt={QariName}
        />
      </div>
      <div className="w-full h-auto sm:h-10 pl-1.5 py-2 sm:py-3 text-white text-sm sm:text-base text-left">
        <span className="block truncate" title={QariName}>
          {QariName}
        </span>
      </div>
    </div>
  )
}

export default Card
