import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Sparkles, Calendar, Clock, Phone, Mail, CheckCircle, ShieldCheck } from "lucide-react";
import { ConciergeBooking } from "../types";
import { formatDateDDMonYYYY } from "../utils/date";

interface ConciergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookSuccess: (booking: ConciergeBooking) => void;
}

export default function ConciergeModal({ isOpen, onClose, onBookSuccess }: ConciergeModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("11:00 AM - 12:30 PM");
  const [consultationType, setConsultationType] = useState<ConciergeBooking["consultationType"]>("Bridal Fitting");
  const [notes, setNotes] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone || !date) return;

    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setIsSuccess(true);
      onBookSuccess({
        name,
        email,
        phone,
        date,
        timeSlot,
        consultationType,
        notes
      });
    }, 1800);
  };

  const handleDismiss = () => {
    setName("");
    setEmail("");
    setPhone("");
    setDate("");
    setNotes("");
    setIsSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        id="concierge-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      >
        <motion.div
          id="concierge-container"
          initial={{ y: 30, scale: 0.95 }}
          animate={{ y: 0, scale: 1 }}
          exit={{ y: 30, scale: 0.95 }}
          className="w-full max-w-xl bg-cream-100 border border-gold-500/40 rounded-none shadow-2xl relative overflow-hidden p-6 md:p-8"
        >
          {/* Circular frame background motif */}
          <div className="absolute -bottom-24 -left-24 w-60 h-60 border border-gold-500/10 rounded-full pointer-events-none" />

          {/* Close Trigger */}
          <button
            id="concierge-close"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-gold-600 hover:text-maroon-900 hover:bg-gold-50 transition-all"
            aria-label="Close concierge form"
          >
            <X className="w-5 h-5" />
          </button>

          {isSuccess ? (
            /* Booking confirmation screen */
            <motion.div
              id="concierge-success-panel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center text-center py-6 gap-4"
            >
              <div className="w-14 h-14 bg-gold-100 border border-gold-500 rounded-full flex items-center justify-center text-gold-600 animate-pulse">
                <CheckCircle className="w-8 h-8" />
              </div>
              
              <div>
                <span className="text-[9px] tracking-[0.3em] text-gold-600 font-extrabold block mb-1 uppercase">APPOINTMENT BOOKED</span>
                <h3 className="font-display font-black text-xl md:text-2xl text-maroon-900 tracking-wider text-gold-shimmer uppercase">BOOKING CONFIRMED</h3>
                <p className="text-xs text-espresso/70 mt-2 max-w-md mx-auto leading-relaxed">
                  Thank you, <span className="font-bold text-maroon-900">{name}</span>. Your consultation for **{consultationType}** on **{formatDateDDMonYYYY(date)}** ({timeSlot}) has been registered. Our team will contact you via **{phone}** within 3 hours to verify details and arrange courier catalogues.
                </p>
              </div>

              <div className="w-full bg-cream-200/40 p-4 border border-gold-500/15 rounded-none text-left text-xs font-serif space-y-1 mt-2">
                <p className="font-bold text-maroon-900 uppercase tracking-widest text-[10px] border-b border-gold-500/10 pb-1 mb-2 font-display">BOOKING SUMMARY</p>
                <p><span className="font-sans text-[10px] text-espresso/50">Consultation:</span> {consultationType}</p>
                <p><span className="font-sans text-[10px] text-espresso/50">Scheduled:</span> {date} at {timeSlot}</p>
                <p><span className="font-sans text-[10px] text-espresso/50">Location:</span> Laxmi Designers Studio (Machilipatnam / Online Zoom)</p>
              </div>

              <button
                id="concierge-success-dismiss"
                onClick={handleDismiss}
                className="mt-4 px-6 py-2.5 bg-maroon-900 hover:bg-maroon-800 text-gold-300 border border-gold-500 text-[10px] tracking-widest font-bold rounded-none uppercase transition-colors"
              >
                DISMISS SUMMARY
              </button>
            </motion.div>
          ) : (
            /* Booking Form */
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="text-center pb-2 border-b border-gold-500/15">
                <div className="flex items-center justify-center gap-1.5 text-gold-500 mb-1">
                  <Sparkles className="w-4 h-4 text-gold-500 animate-pulse" />
                  <span className="text-[9px] tracking-[0.3em] font-extrabold uppercase">BOOK AN APPOINTMENT</span>
                  <Sparkles className="w-4 h-4 text-gold-500 animate-pulse" />
                </div>
                <h3 className="font-display font-black text-xl text-maroon-900 tracking-wide uppercase text-gold-shimmer">
                  BOOK A CONSULTATION
                </h3>
                <p className="text-[10px] tracking-wider text-espresso/60 uppercase mt-1">
                  Book an in-person or online consultation
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                <div>
                  <label className="text-[9px] font-bold text-espresso/60 block mb-1 uppercase">Your Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Meera Singhania"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-cream-100/50 border border-gold-500/20 px-3 py-2 text-xs rounded-none focus:outline-none focus:border-gold-500 text-espresso font-medium"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-espresso/60 block mb-1 uppercase">Consultation Type *</label>
                  <select
                    value={consultationType}
                    onChange={(e) => setConsultationType(e.target.value as ConciergeBooking["consultationType"])}
                    className="w-full bg-cream-100/50 border border-gold-500/20 px-3 py-2 text-xs rounded-none focus:outline-none focus:border-gold-500 text-espresso font-medium"
                  >
                    <option value="Bridal Fitting">Bridal Fitting</option>
                    <option value="Groom Outfit">Groom Outfit</option>
                    <option value="Custom Measurements">Custom Measurements</option>
                    <option value="Online Consultation">Online Consultation (Zoom)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-espresso/60 block mb-1 uppercase">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-cream-100/50 border border-gold-500/20 px-3 py-2 text-xs rounded-none focus:outline-none focus:border-gold-500 text-espresso font-medium"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-espresso/60 block mb-1 uppercase">Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="meera@dynasty.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-cream-100/50 border border-gold-500/20 px-3 py-2 text-xs rounded-none focus:outline-none focus:border-gold-500 text-espresso font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-espresso/60 block mb-1 uppercase">Appointment Date *</label>
                  <div className="relative flex items-center">
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split("T")[0]}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-cream-100/50 border border-gold-500/20 px-3 py-2 text-xs rounded-none focus:outline-none focus:border-gold-500 text-espresso font-medium"
                    />
                    <Calendar className="w-4 h-4 text-gold-600 absolute right-3 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-espresso/60 block mb-1 uppercase">Preferred Time *</label>
                  <select
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="w-full bg-cream-100/50 border border-gold-500/20 px-3 py-2 text-xs rounded-none focus:outline-none focus:border-gold-500 text-espresso font-medium"
                  >
                    <option value="11:00 AM - 12:30 PM">11:00 AM - 12:30 PM (Morning slots)</option>
                    <option value="01:30 PM - 03:00 PM">01:30 PM - 03:00 PM (Afternoon)</option>
                    <option value="04:00 PM - 05:30 PM">04:00 PM - 05:30 PM (Evening)</option>
                    <option value="06:30 PM - 08:00 PM">06:30 PM - 08:00 PM (Exclusive late access)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold text-espresso/60 block mb-1 uppercase">Special requests / Fitting guidelines</label>
                <textarea
                  placeholder="Tell us about your wedding color themes, desired fabrics (silk, organza), or custom sizing requirements..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-cream-100/50 border border-gold-500/20 p-2.5 text-xs rounded-none focus:outline-none focus:border-gold-500 text-espresso h-20 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-gold-500 hover:bg-gold-300 disabled:bg-gold-500/40 text-maroon-900 border border-gold-500 hover:border-gold-300 font-bold text-xs tracking-[0.2em] rounded-none flex items-center justify-center gap-1.5 transition-all uppercase shadow"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-maroon-900 border-t-transparent rounded-full animate-spin" />
                    <span>SENDING...</span>
                  </div>
                ) : (
                  <>
                    <Calendar className="w-4 h-4" />
                    <span>BOOK APPOINTMENT</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[9px] text-espresso/40 font-bold uppercase mt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-gold-500" />
                <span>Priority Booking • 100% Confidential</span>
              </div>
            </form>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
