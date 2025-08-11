import React, { useCallback, useState } from "react";

interface AvatarProps {
  src?: string;
  name?: string;
  size?: number;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name = "User",
  size = 40,
}) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleImageError = useCallback(() => {
    setImageError(true);
    setIsLoading(false);
  }, []);

  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Create fallback avatar URL
  const fallbackSrc = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0d8bd0&color=fff&size=${size}`;

  if (!src || imageError) {
    return (
      <img
        src={fallbackSrc}
        alt={name}
        className="avatar"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: "50%",
          objectFit: "cover",
        }}
      />
    );
  }

  return (
    <>
      {isLoading && (
        <div
          className="avatar-placeholder"
          style={{
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: "50%",
            backgroundColor: "#f0f0f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "12px",
            color: "#666",
          }}
        >
          Loading...
        </div>
      )}
      <img
        src={src}
        alt={name}
        className="avatar"
        onError={handleImageError}
        onLoad={handleImageLoad}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: "50%",
          objectFit: "cover",
          display: isLoading ? "none" : "block",
        }}
      />
    </>
  );
};
