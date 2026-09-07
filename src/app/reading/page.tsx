import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { listReadings } from "@/features/reading/list-readings";
import { GENRES, LEVELS } from "@/features/reading/labels";
import { ReadingFilters } from "@/components/reading/ReadingFilters";
import { ReadingCard } from "@/components/reading/ReadingCard";
import type { ReadingGenre, ReadingLevel } from "@prisma/client";

export const metadata: Metadata = { title: "Đọc song ngữ" };

export default async function ReadingListPage({ searchParams }: { searchParams: Promise<{ genre?: string; level?: string }> }) {
  const sp = await searchParams;
  const genre = GENRES.includes(sp.genre as ReadingGenre) ? (sp.genre as ReadingGenre) : undefined;
  const level = LEVELS.includes(sp.level as ReadingLevel) ? (sp.level as ReadingLevel) : undefined;
  const dangLoc = genre !== undefined || level !== undefined;

  const items = await listReadings(prisma, { genre, level });

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="flex items-center gap-2.5 text-3xl font-extrabold">
          <BookOpen size={26} className="text-accent-text" aria-hidden="true" />
          Đọc song ngữ
        </h1>
        <p className="mt-2 text-muted">Đọc tiếng Anh với bản dịch cạnh bên. Bôi đen từ để tra và lưu vào sổ từ vựng.</p>
      </header>

      <ReadingFilters genre={genre} level={level} />

      {items.length === 0 ? (
        <p className="card p-6 text-muted">Chưa có bài nào{dangLoc ? " khớp bộ lọc" : " được đăng"}.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.id}>
              <ReadingCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
