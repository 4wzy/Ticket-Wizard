"use client";

import { motion } from "framer-motion";
import { useState } from "react";

const testimonials = [
	{
		quote: "This tool transformed our ticket quality overnight. Requirements that used to take multiple clarification cycles now come out clear and comprehensive from the start.",
		author: 'Sarah Chen',
		role: 'Lead Developer',
		company: 'JPMC Technology',
		avatar: '👩‍💻',
		rating: 5,
		highlight: 'requirement clarity'
	},
	{
		quote: "Our team's velocity increased significantly. The tool understands JPMC standards and produces tickets that align with our architectural guidelines.",
		author: 'Marcus Rodriguez',
		role: 'Scrum Master',
		company: 'JPMC Digital',
		avatar: '👨‍💼',
		rating: 5,
		highlight: 'enterprise standards'
	},
	{
		quote: "The consistency across our distributed teams is remarkable. Every ticket follows our established patterns and technical vocabulary.",
		author: 'Alex Kim',
		role: 'Senior Developer',
		company: 'JPMC Engineering',
		avatar: '👨‍💻',
		rating: 5,
		highlight: 'team consistency'
	},
	{
		quote: "The intelligent context gathering helps capture all the nuances of complex banking requirements. It's built for our kind of work.",
		author: 'Emily Watson',
		role: 'Product Manager',
		company: 'JPMC Platforms',
		avatar: '👩‍💼',
		rating: 5,
		highlight: 'domain expertise'
	},
	{
		quote: "Seamless integration with our existing Jira workflows. The tool respects our governance processes while dramatically improving efficiency.",
		author: 'David Park',
		role: 'Engineering Manager',
		company: 'JPMC Infrastructure',
		avatar: '👨‍🔧',
		rating: 5,
		highlight: 'workflow integration'
	},
	{
		quote: 'Development cycles are smoother with fewer back-and-forth clarifications. The tool helps maintain the high standards we expect at JPMC.',
		author: 'Lisa Thompson',
		role: 'VP Technology',
		company: 'JPMC Corporate Technology',
		avatar: '👩‍🚀',
		rating: 5,
		highlight: 'quality standards'
	}
];

const TestimonialSection = () => {
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

	return (
		<section className="relative py-32 px-6 md:px-16 lg:px-32 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden">
			{/* Enhanced Background Effects */}
			<div className="absolute inset-0 overflow-hidden">
				{/* Animated gradient meshes */}
				<motion.div 
					className="absolute top-1/3 left-1/3 w-96 h-96 bg-gradient-to-r from-purple-600/15 to-pink-600/15 rounded-full blur-3xl"
					animate={{
						x: [0, -100, 0],
						y: [0, 50, 0],
						scale: [1, 1.3, 1]
					}}
					transition={{
						duration: 15,
						repeat: Infinity,
						ease: "easeInOut"
					}}
				/>
				<motion.div 
					className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-gradient-to-r from-indigo-600/15 to-purple-600/15 rounded-full blur-3xl"
					animate={{
						x: [0, 80, 0],
						y: [0, -60, 0],
						scale: [1, 1.2, 1]
					}}
					transition={{
						duration: 12,
						repeat: Infinity,
						ease: "easeInOut",
						delay: 3
					}}
				/>

				{/* Floating testimonial elements */}
				{Array.from({ length: 12 }).map((_, i) => (
					<motion.div
						key={i}
						className={`absolute rounded-full ${
							i % 4 === 0 
								? 'w-3 h-3 bg-gradient-to-r from-yellow-400 to-orange-400' 
								: i % 4 === 1 
								? 'w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400'
								: i % 4 === 2
								? 'w-1.5 h-1.5 bg-gradient-to-r from-indigo-400 to-purple-400'
								: 'w-1 h-1 bg-gradient-to-r from-cyan-400 to-indigo-400'
						}`}
						initial={{
							x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1200),
							y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
							opacity: 0,
						}}
						animate={{
							y: [null, -80, 0],
							opacity: [0, 0.7, 0],
							scale: [0.3, 2.5, 0.3],
						}}
						transition={{
							duration: 8 + Math.random() * 4,
							repeat: Infinity,
							ease: "easeInOut",
							delay: Math.random() * 6,
						}}
					/>
				))}

				{/* Enhanced grid pattern */}
				<div className="absolute inset-0 bg-[linear-gradient(rgba(147,51,234,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(147,51,234,0.04)_1px,transparent_1px)] bg-[size:100px_100px] opacity-30"></div>
			</div>

			<div className="max-w-7xl mx-auto z-10 relative">
				{/* Enhanced Header */}
				<motion.div
					className="text-center mb-20"
					initial={{ opacity: 0, y: 40 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8 }}
					viewport={{ once: true }}
				>
					<motion.h2 
						className="text-5xl md:text-6xl lg:text-7xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-purple-300 via-pink-300 to-orange-300 relative"
						initial={{ opacity: 0, scale: 0.9 }}
						whileInView={{ opacity: 1, scale: 1 }}
						transition={{ duration: 1, delay: 0.2 }}
						viewport={{ once: true }}
					>
						JPMC Teams Share Results
						<motion.div
							className="absolute inset-0 text-5xl md:text-6xl lg:text-7xl font-bold text-pink-400/15 blur-sm -z-10"
							animate={{ 
								textShadow: [
									"0 0 0px rgba(236, 72, 153, 0)",
									"0 0 35px rgba(236, 72, 153, 0.4)",
									"0 0 0px rgba(236, 72, 153, 0)"
								]
							}}
							transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
						>
							JPMC Teams Share Results
						</motion.div>
					</motion.h2>
					
					<motion.p
						className="text-xl md:text-2xl text-neutral-300 max-w-4xl mx-auto leading-relaxed"
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.8, delay: 0.4 }}
						viewport={{ once: true }}
					>
						See how TicketWizard enhances <span className="text-pink-300 font-semibold">JPMC development workflows</span> and maintains our quality standards.
					</motion.p>
				</motion.div>

				{/* Enhanced Testimonials Grid */}
				<motion.div
					className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
					initial="hidden"
					whileInView="visible"
					viewport={{ once: true }}
					variants={{
						hidden: { opacity: 0 },
						visible: {
							opacity: 1,
							transition: { staggerChildren: 0.15 },
						},
					}}
				>
					{testimonials.map((testimonial, index) => (
						<motion.div
							key={index}
							className="group relative"
							variants={{
								hidden: { opacity: 0, y: 50, rotateX: -15 },
								visible: { opacity: 1, y: 0, rotateX: 0 },
							}}
							transition={{ duration: 0.6, ease: "easeOut" }}
							onMouseEnter={() => setHoveredIndex(index)}
							onMouseLeave={() => setHoveredIndex(null)}
						>
							{/* Card Container */}
							<motion.div
								className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl p-8 rounded-3xl border border-slate-700/50 hover:border-pink-400/40 transition-all duration-500 relative overflow-hidden h-full"
								whileHover={{ 
									y: -8, 
									scale: 1.02,
									boxShadow: "0 25px 50px -12px rgba(236, 72, 153, 0.25)"
								}}
								transition={{ duration: 0.3 }}
							>
								{/* Dynamic background gradient */}
								<motion.div
									className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"
								/>

								{/* Animated border on hover */}
								<motion.div
									className="absolute inset-0 rounded-3xl"
									initial={false}
									animate={{
										background: hoveredIndex === index 
											? 'conic-gradient(from 0deg, transparent, rgb(236, 72, 153), transparent)'
											: 'transparent'
									}}
									transition={{ duration: 0.3 }}
									style={{
										padding: '2px',
										mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
										maskComposite: 'subtract'
									}}
								/>

								<div className="relative z-10">
									{/* Quote Icon */}
									<motion.div 
										className="text-4xl text-pink-400/60 mb-6"
										animate={{ 
											rotate: hoveredIndex === index ? [0, 5, -5, 0] : 0,
											scale: hoveredIndex === index ? 1.1 : 1
										}}
										transition={{ duration: 0.5 }}
									>
										"
									</motion.div>

									{/* Quote */}
									<motion.p 
										className="text-lg text-neutral-200 mb-8 leading-relaxed font-medium italic group-hover:text-white transition-colors duration-300"
										initial={{ opacity: 0.8 }}
										whileHover={{ opacity: 1 }}
									>
										{testimonial.quote}
									</motion.p>

									{/* Rating Stars */}
									<motion.div 
										className="flex justify-center mb-6 space-x-1"
										initial={{ opacity: 0 }}
										animate={{ opacity: hoveredIndex === index ? 1 : 0 }}
										transition={{ duration: 0.3 }}
									>
										{Array.from({ length: testimonial.rating }).map((_, i) => (
											<motion.span
												key={i}
												className="text-yellow-400 text-xl"
												initial={{ opacity: 0, scale: 0 }}
												animate={{ 
													opacity: hoveredIndex === index ? 1 : 0,
													scale: hoveredIndex === index ? 1 : 0
												}}
												transition={{ duration: 0.2, delay: i * 0.1 }}
											>
												⭐
											</motion.span>
										))}
									</motion.div>

									{/* Author Info */}
									<div className="text-center border-t border-slate-700/50 pt-6">
										{/* Avatar */}
										<motion.div 
											className="text-4xl mb-3 mx-auto w-16 h-16 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-full flex items-center justify-center border border-pink-400/20"
											whileHover={{ scale: 1.1, rotate: 5 }}
											transition={{ duration: 0.3 }}
										>
											{testimonial.avatar}
										</motion.div>

										{/* Name */}
										<motion.h3 
											className="text-lg font-bold text-white mb-1 group-hover:text-pink-200 transition-colors duration-300"
										>
											{testimonial.author}
										</motion.h3>

										{/* Role & Company */}
										<p className="text-sm text-neutral-400 mb-2">{testimonial.role}</p>
										<p className="text-xs text-pink-400/80 font-medium">{testimonial.company}</p>

										{/* Highlight Tag */}
										<motion.div
											className="mt-4 inline-block px-3 py-1 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-full border border-pink-400/30 text-xs text-pink-300"
											initial={{ opacity: 0, scale: 0.8 }}
											animate={{ 
												opacity: hoveredIndex === index ? 1 : 0,
												scale: hoveredIndex === index ? 1 : 0.8
											}}
											transition={{ duration: 0.3, delay: 0.2 }}
										>
											✨ {testimonial.highlight}
										</motion.div>
									</div>
								</div>

								{/* Corner accent */}
								<div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-pink-500/10 to-purple-500/10 opacity-30 rounded-tr-3xl" />
							</motion.div>
						</motion.div>
					))}
				</motion.div>

				{/* Social Proof Section */}
				<motion.div
					className="text-center mt-20"
					initial={{ opacity: 0, y: 30 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8, delay: 0.6 }}
					viewport={{ once: true }}
				>
					<motion.div
						className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-8 mb-12"
						initial={{ opacity: 0 }}
						whileInView={{ opacity: 1 }}
						transition={{ duration: 1, delay: 0.8 }}
						viewport={{ once: true }}
					>
						<div className="flex items-center space-x-2">
							<span className="text-3xl">⭐⭐⭐⭐⭐</span>
							<span className="text-lg font-semibold text-white">5.0 average rating</span>
						</div>
						<div className="w-px h-8 bg-slate-600 hidden sm:block"></div>
						<div className="text-neutral-400">
							<span className="text-2xl font-bold text-pink-400">JPMC</span> teams improving efficiency
						</div>
					</motion.div>

					<motion.button
						className="bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-purple-600 hover:via-pink-600 hover:to-rose-600 text-white font-semibold py-4 px-10 rounded-full shadow-2xl hover:shadow-pink-500/25 transition-all duration-300 relative overflow-hidden group"
						whileHover={{ scale: 1.05, y: -2 }}
						whileTap={{ scale: 0.95 }}
					>
						<span className="relative z-10">Join JPMC Teams Using TicketWizard</span>
						<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
					</motion.button>
				</motion.div>
			</div>
		</section>
	);
};

export default TestimonialSection;