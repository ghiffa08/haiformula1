import { getMatchedDriver, getHighResImg, FALLBACK_AVATAR } from '../../utils/helpers';

const DriverAvatar = ({ openF1Drivers, driver, style, className }) => {
  const matched = getMatchedDriver(openF1Drivers, driver);
  const headshotUrl = matched ? getHighResImg(matched.headshot_url) : null;

  return (
    <img
      loading="lazy"
      decoding="async"
      src={headshotUrl || FALLBACK_AVATAR}
      alt={driver?.familyName || 'Driver'}
      style={style}
      className={className}
      onError={(e) => {
        if (e.target.src !== FALLBACK_AVATAR) {
          e.target.src = FALLBACK_AVATAR;
        }
      }}
    />
  );
};

export default DriverAvatar;
