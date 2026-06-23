import { ImageResponse } from "next/og";
import { getProfileWithUser } from "@/core/profiles/queries";

export const alt = "Mentor profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getProfileWithUser(id);

  if (!data) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#09090b",
            color: "#fafafa",
            fontSize: 48,
            fontWeight: 600,
          }}
        >
          Grsshppr
        </div>
      ),
      size
    );
  }

  const { profile, user } = data;
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const tags = (profile.expertise ?? []).slice(0, 4);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px 80px",
          backgroundColor: "#09090b",
          color: "#fafafa",
        }}
      >
        {/* Top: avatar + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt=""
              width={96}
              height={96}
              style={{ borderRadius: 48 }}
            />
          ) : (
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: 48,
                backgroundColor: "#27272a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 36,
                fontWeight: 600,
              }}
            >
              {initials}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 48, fontWeight: 600, lineHeight: 1.1 }}>
              {user.name}
            </div>
            {profile.headline && (
              <div
                style={{
                  fontSize: 24,
                  color: "#a1a1aa",
                  marginTop: 8,
                }}
              >
                {profile.headline}
              </div>
            )}
          </div>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 40,
              flexWrap: "wrap",
            }}
          >
            {tags.map((tag) => (
              <div
                key={tag}
                style={{
                  fontSize: 20,
                  padding: "8px 20px",
                  borderRadius: 9999,
                  backgroundColor: "#27272a",
                  color: "#d4d4d8",
                }}
              >
                {tag}
              </div>
            ))}
          </div>
        )}

        {/* Footer branding */}
        <div
          style={{
            position: "absolute",
            bottom: 50,
            right: 80,
            fontSize: 24,
            color: "#52525b",
          }}
        >
          grsshppr.org
        </div>
      </div>
    ),
    size
  );
}
