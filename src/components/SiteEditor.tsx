import React, { useState } from "react";
import { Plus, Trash2, Save, Globe, Megaphone, Home, Info, Scissors, Sparkles, BookOpen } from "lucide-react";
import { SiteContent, ServiceItem, JournalItem } from "../siteContent";
import ImageUploadField from "./ImageUploadField";

interface SiteEditorProps {
  content: SiteContent;
  onSave: (content: SiteContent) => void;
}

const inputCls =
  "w-full bg-cream-50 border border-gold-500/20 p-2 text-xs rounded focus:outline-none focus:border-gold-500 text-espresso font-medium";
const labelCls = "text-espresso/70 block mb-1 uppercase text-[10px] tracking-wider font-bold";

function Section({ icon: Icon, title, hint, children }: { icon: any; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="bg-cream-100 border border-[#D4AF37]/20 p-6 rounded-lg space-y-4">
      <div className="border-b border-[#D4AF37]/10 pb-2">
        <h3 className="font-display font-bold text-maroon-900 uppercase text-sm flex items-center gap-2">
          <Icon className="w-4 h-4 text-[#D4AF37]" /> {title}
        </h3>
        {hint && <p className="text-[10px] text-espresso/50 mt-1 leading-relaxed">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

/**
 * Admin → Site Editor. Edits every piece of website copy (announcement bar,
 * homepage manifesto, About, Services, specialties ribbon, journal) plus the
 * SEO title/description. Keeps a local draft; one "Save all changes" button
 * persists the whole thing.
 */
export default function SiteEditor({ content, onSave }: SiteEditorProps) {
  const [draft, setDraft] = useState<SiteContent>(content);
  const [dirty, setDirty] = useState(false);

  const set = <K extends keyof SiteContent>(key: K, value: SiteContent[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setDirty(true);
  };

  const save = () => {
    onSave(draft);
    setDirty(false);
  };

  // Services helpers
  const setService = (i: number, patch: Partial<ServiceItem>) =>
    set("services", draft.services.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const addService = () => set("services", [...draft.services, { title: "New Service", body: "" }]);
  const removeService = (i: number) => set("services", draft.services.filter((_, idx) => idx !== i));

  // Specialties helpers
  const setSpecialty = (i: number, value: string) =>
    set("specialties", draft.specialties.map((s, idx) => (idx === i ? value : s)));
  const addSpecialty = () => set("specialties", [...draft.specialties, "New Specialty"]);
  const removeSpecialty = (i: number) => set("specialties", draft.specialties.filter((_, idx) => idx !== i));

  // Journal helpers
  const setStory = (i: number, patch: Partial<JournalItem>) =>
    set("journal", draft.journal.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const addStory = () =>
    set("journal", [
      ...draft.journal,
      { id: `st-${crypto.randomUUID()}`, title: "New Story", subtitle: "", date: "", readTime: "3 min read", image: "", content: "" },
    ]);
  const removeStory = (i: number) => set("journal", draft.journal.filter((_, idx) => idx !== i));

  return (
    <div id="tab-site-editor" className="space-y-6 animate-fade-in text-xs font-semibold">
      {/* Sticky save bar */}
      <div className="sticky top-0 z-10 -mt-2 py-2 bg-cream-50/95 backdrop-blur flex items-center justify-between">
        <p className="text-[11px] text-espresso/60">
          {dirty ? "You have unsaved changes." : "All changes saved."}
        </p>
        <button
          onClick={save}
          disabled={!dirty}
          className="px-5 py-2.5 bg-[#1A0508] hover:bg-[#D4AF37] hover:text-[#1A0508] border border-[#D4AF37] text-[#D4AF37] font-bold text-[11px] tracking-wider uppercase transition-all rounded cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Save className="w-3.5 h-3.5" /> Save all changes
        </button>
      </div>

      {/* SEO */}
      <Section icon={Globe} title="SEO / Browser Tab" hint="The page title and description Google shows. (Note: WhatsApp/Facebook link previews read the fixed HTML and won't reflect changes here.)">
        <div>
          <label className={labelCls}>Page Title</label>
          <input className={inputCls} value={draft.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Meta Description</label>
          <textarea className={`${inputCls} h-16 resize-none`} value={draft.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} />
        </div>
      </Section>

      {/* Announcement */}
      <Section icon={Megaphone} title="Announcement Bar" hint="The thin strip at the very top of every page.">
        <input className={inputCls} value={draft.announcement} onChange={(e) => set("announcement", e.target.value)} />
      </Section>

      {/* Homepage manifesto */}
      <Section icon={Home} title="Homepage — Heritage Section">
        <div>
          <label className={labelCls}>Eyebrow (small text)</label>
          <input className={inputCls} value={draft.homeEyebrow} onChange={(e) => set("homeEyebrow", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Heading</label>
          <input className={inputCls} value={draft.homeHeading} onChange={(e) => set("homeHeading", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Body</label>
          <textarea className={`${inputCls} h-24 resize-none`} value={draft.homeBody} onChange={(e) => set("homeBody", e.target.value)} />
        </div>
      </Section>

      {/* About */}
      <Section icon={Info} title="About Us Page">
        <div>
          <label className={labelCls}>Eyebrow</label>
          <input className={inputCls} value={draft.aboutEyebrow} onChange={(e) => set("aboutEyebrow", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Heading</label>
          <input className={inputCls} value={draft.aboutHeading} onChange={(e) => set("aboutHeading", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Intro (below the heading)</label>
          <textarea className={`${inputCls} h-20 resize-none`} value={draft.aboutIntro} onChange={(e) => set("aboutIntro", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Body (optional — extra paragraphs)</label>
          <textarea className={`${inputCls} h-28 resize-none`} value={draft.aboutBody} onChange={(e) => set("aboutBody", e.target.value)} placeholder="Add more about your story, team, studio…" />
        </div>
      </Section>

      {/* Services */}
      <Section icon={Scissors} title="Services Page">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Eyebrow</label>
            <input className={inputCls} value={draft.servicesEyebrow} onChange={(e) => set("servicesEyebrow", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Heading</label>
            <input className={inputCls} value={draft.servicesHeading} onChange={(e) => set("servicesHeading", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Subtitle</label>
            <input className={inputCls} value={draft.servicesSubtitle} onChange={(e) => set("servicesSubtitle", e.target.value)} />
          </div>
        </div>
        <div className="space-y-3">
          {draft.services.map((svc, i) => (
            <div key={i} className="p-3 border border-[#D4AF37]/15 bg-[#1A0508]/5 rounded space-y-2">
              <div className="flex gap-2">
                <input className={inputCls} value={svc.title} onChange={(e) => setService(i, { title: e.target.value })} placeholder="Service title" />
                <button onClick={() => removeService(i)} title="Remove service" className="p-1.5 bg-cream-200 text-red-700 hover:bg-red-700 hover:text-white rounded transition-colors shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <textarea className={`${inputCls} h-20 resize-none`} value={svc.body} onChange={(e) => setService(i, { body: e.target.value })} placeholder="Description" />
            </div>
          ))}
          <button onClick={addService} className="text-[10px] font-bold uppercase tracking-wider text-gold-700 hover:text-maroon-900 flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Add service
          </button>
        </div>
      </Section>

      {/* Specialties */}
      <Section icon={Sparkles} title="Specialties Ribbon" hint="The gold moving strip on the homepage.">
        <div className="flex flex-wrap gap-2">
          {draft.specialties.map((s, i) => (
            <div key={i} className="flex items-center gap-1 bg-[#1A0508]/5 border border-[#D4AF37]/15 rounded pl-2">
              <input
                className="bg-transparent text-xs text-espresso font-medium py-1.5 focus:outline-none w-32"
                value={s}
                onChange={(e) => setSpecialty(i, e.target.value)}
              />
              <button onClick={() => removeSpecialty(i)} className="p-1 text-red-700 hover:text-red-900" title="Remove">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button onClick={addSpecialty} className="text-[10px] font-bold uppercase tracking-wider text-gold-700 hover:text-maroon-900 flex items-center gap-1 px-2">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
      </Section>

      {/* Journal */}
      <Section icon={BookOpen} title="Journal / Stories" hint="Blog-style articles shown on the Journal page and (first 3) on the homepage.">
        <div className="space-y-4">
          {draft.journal.map((st, i) => (
            <div key={st.id} className="p-3 border border-[#D4AF37]/15 bg-[#1A0508]/5 rounded space-y-2">
              <div className="flex gap-2">
                <input className={inputCls} value={st.title} onChange={(e) => setStory(i, { title: e.target.value })} placeholder="Story title" />
                <button onClick={() => removeStory(i)} title="Remove story" className="p-1.5 bg-cream-200 text-red-700 hover:bg-red-700 hover:text-white rounded transition-colors shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <input className={inputCls} value={st.subtitle} onChange={(e) => setStory(i, { subtitle: e.target.value })} placeholder="Subtitle" />
              <div className="grid grid-cols-2 gap-2">
                <input className={inputCls} value={st.date} onChange={(e) => setStory(i, { date: e.target.value })} placeholder="Date (e.g. 20/JUL/2026)" />
                <input className={inputCls} value={st.readTime} onChange={(e) => setStory(i, { readTime: e.target.value })} placeholder="Read time (e.g. 4 min read)" />
              </div>
              <ImageUploadField label="Cover Image" preset="banner" value={st.image} onChange={(url) => setStory(i, { image: url })} />
              <textarea className={`${inputCls} h-28 resize-none`} value={st.content} onChange={(e) => setStory(i, { content: e.target.value })} placeholder="Full story text" />
            </div>
          ))}
          <button onClick={addStory} className="text-[10px] font-bold uppercase tracking-wider text-gold-700 hover:text-maroon-900 flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Add story
          </button>
        </div>
      </Section>

      {/* Bottom save (mirror of the top one) */}
      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={!dirty}
          className="px-5 py-2.5 bg-[#1A0508] hover:bg-[#D4AF37] hover:text-[#1A0508] border border-[#D4AF37] text-[#D4AF37] font-bold text-[11px] tracking-wider uppercase transition-all rounded cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Save className="w-3.5 h-3.5" /> Save all changes
        </button>
      </div>
    </div>
  );
}
