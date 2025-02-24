import { FaLinkedin, FaGithub } from "react-icons/fa";
import { MdEmail, MdDescription } from "react-icons/md";

export default function About() {
  return (
    <div className="h-full">
      <h1 className="text-[#0ea5e9] dark:text-[#38bdf8] text-4xl font-bold mb-4">
        About Me
      </h1>
      <p className="text-[#334155] dark:text-[#94a3b8] text-lg leading-relaxed mb-8">
        Hi, I&apos;m John Fritter.
        <br />
        <br />
        I like figuring things out and making things work. Sometimes that&apos;s software, sometimes it&apos;s hardware, sometimes it&apos;s just a better way to do something. I&apos;ve worked in semiconductor manufacturing, built full-stack apps, and spent too much time messing with gadgets and robots and tools and games. I like learning, I like solving problems, and I like making things that didn&apos;t exist before.
      </p>
      
      <div className="flex flex-col gap-4">
        <h2 className="text-[#0ea5e9] dark:text-[#38bdf8] text-2xl font-semibold">
          Connect With Me
        </h2>
        <div className="flex gap-6">
          <a
            href="https://linkedin.com/in/john-fritter"
            target="_blank"
            rel="noopener noreferrer"
            title="Connect on LinkedIn"
            className="text-[#334155] dark:text-[#94a3b8] hover:text-[#0ea5e9] dark:hover:text-[#38bdf8] transition-colors text-2xl"
          >
            <FaLinkedin />
          </a>
          <a
            href="https://github.com/john-fritter"
            target="_blank"
            rel="noopener noreferrer"
            title="View GitHub Profile"
            className="text-[#334155] dark:text-[#94a3b8] hover:text-[#0ea5e9] dark:hover:text-[#38bdf8] transition-colors text-2xl"
          >
            <FaGithub />
          </a>
          <a
            href="mailto:jefritter@gmail.com"
            title="Send Email"
            className="text-[#334155] dark:text-[#94a3b8] hover:text-[#0ea5e9] dark:hover:text-[#38bdf8] transition-colors text-2xl"
          >
            <MdEmail />
          </a>
          <a
            href="https://drive.google.com/file/d/1Bqm5Y0Cj8sS-HVqUbrLUbnlo1pT2KVdH/view?usp=sharing"
            download
            title="View My Resume"
            className="text-[#334155] dark:text-[#94a3b8] hover:text-[#0ea5e9] dark:hover:text-[#38bdf8] transition-colors text-2xl"
          >
            <MdDescription />
          </a>
        </div>
      </div>
    </div>
  );
}
  